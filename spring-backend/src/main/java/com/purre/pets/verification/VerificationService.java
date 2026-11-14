package com.purre.pets.verification;

import com.purre.pets.common.ApiException;
import com.purre.pets.common.StorageService;
import com.purre.pets.config.AppProperties;
import com.purre.pets.user.Role;
import com.purre.pets.user.User;
import com.purre.pets.user.UserRepository;
import com.purre.pets.verification.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class VerificationService {

    private static final long MAX_DOC_SIZE = 10L * 1024 * 1024;
    private static final long RETENTION_DAYS = 30;

    private final VerificationRepository verificationRepository;
    private final VerificationDocumentRepository documentRepository;
    private final VerificationAccessLogRepository accessLogRepository;
    private final VerificationHistoryRepository historyRepository;
    private final DocumentCryptoService cryptoService;
    private final StorageService storageService;
    private final AiClient aiClient;
    private final UserRepository userRepository;
    private final AppProperties props;

    @Transactional
    public VerificationDto submit(Long userId, SubmitVerificationRequest req, List<MultipartFile> files) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Użytkownik nie istnieje."));
        if (user.getRole() != Role.BREEDER) {
            throw ApiException.forbidden("NOT_BREEDER", "Weryfikacja hodowli jest dostępna tylko dla kont HODOWCA.");
        }
        if (files == null || files.isEmpty()) {
            throw ApiException.badRequest("DOCS_REQUIRED", "Załącz co najmniej 3 dokumenty (rejestracja hodowli, dowód tożsamości, zaświadczenie).");
        }
        if (files.size() > 20) {
            throw ApiException.badRequest("TOO_MANY_DOCS", "Maksymalnie 20 plików.");
        }

        BreederVerification verification = verificationRepository.findByUserId(userId).orElse(null);
        Instant now = Instant.now();
        if (verification != null && verification.getStatus() == VerificationStatus.PENDING) {
            throw ApiException.conflict("VERIFICATION_IN_PROGRESS", "Weryfikacja jest już w toku — poczekaj na decyzję administratora.");
        }
        VerificationStatus fromStatus = verification == null ? null : verification.getStatus();
        if (verification == null) {
            verification = BreederVerification.builder().userId(userId).createdAt(now).build();
        }
        verification.setStatus(VerificationStatus.PENDING);
        verification.setKennelNumber(req.kennelNumber().trim());
        verification.setKennelUnion(req.kennelUnion().trim());
        verification.setRejectionReason(null);
        verification.setAppealMessage(null);
        verification.setAppealedAt(null);
        verification.setUpdatedAt(now);
        verification = verificationRepository.save(verification);

        List<AiClient.FilePart> aiParts = new ArrayList<>();
        List<VerificationDocument> docs = new ArrayList<>();
        for (MultipartFile file : files) {
            validate(file);
            byte[] bytes;
            try { bytes = file.getBytes(); } catch (IOException e) { throw ApiException.badRequest("FILE_READ_ERROR", "Nie udało się odczytać pliku " + file.getOriginalFilename()); }
            String storedPath = storageService.storeEncryptedDocument(cryptoService.encrypt(bytes), file.getOriginalFilename());
            VerificationDocument doc = VerificationDocument.builder()
                    .verificationId(verification.getId())
                    .docType(DocType.LEGALITY_PROOF)
                    .fileName(sanitize(file.getOriginalFilename()))
                    .contentType(file.getContentType() == null ? "application/octet-stream" : file.getContentType())
                    .storedPath(storedPath)
                    .sizeBytes(bytes.length)
                    .createdAt(now)
                    .build();
            docs.add(documentRepository.save(doc));
            aiParts.add(new AiClient.FilePart(file.getOriginalFilename(), bytes));
        }

        AiClient.AnalysisResult analysis = aiClient.analyzeDocuments(aiParts);
        verification.setRiskScore(analysis.riskScore());
        verification.setAiAnalysis(analysis.analysis());

        // Auto-weryfikacja LLM (0.4.0): AI dostępne + niskie ryzyko → APPROVED od razu,
        // bez czekania na administratora. Wyższe ryzyko → PENDING (human-in-the-loop).
        boolean autoApproved = false;
        int threshold = props.getAi().getAutoApproveRiskScore();
        if (analysis.aiAvailable() && analysis.riskScore() != null && threshold >= 0
                && analysis.riskScore() <= threshold) {
            Instant decidedAt = Instant.now();
            verification.setStatus(VerificationStatus.APPROVED);
            verification.setDecidedAt(decidedAt);
            verification.setUpdatedAt(decidedAt);
            autoApproved = true;
            Instant purgeAfter = decidedAt.plus(RETENTION_DAYS, ChronoUnit.DAYS);
            for (VerificationDocument doc : docs) {
                doc.setPurgeAfter(purgeAfter);
                documentRepository.save(doc);
            }
            user.setVerifiedBadge(true);
            userRepository.save(user);
        }
        verification = verificationRepository.save(verification);

        if (autoApproved) {
            history(verification.getId(), VerificationStatus.PENDING.name(), VerificationStatus.APPROVED.name(),
                    "Auto-weryfikacja LLM (riskScore=" + analysis.riskScore() + ")", null);
            log.info("Weryfikacja id={} ZATWIERDZONA AUTOMATYCZNIE przez LLM (riskScore={}).", verification.getId(), analysis.riskScore());
        } else {
            history(verification.getId(), fromStatus == null ? null : fromStatus.name(), VerificationStatus.PENDING.name(),
                    "Złożono dokumenty (" + docs.size() + " plików)", userId);
            log.info("Weryfikacja id={} złożona, riskScore={}, ai={} → oczekuje na admina.", verification.getId(), analysis.riskScore(), analysis.aiAvailable());
        }
        return VerificationDto.from(verification, docs.stream().map(DocumentDto::from).toList());
    }

    @Transactional(readOnly = true)
    public VerificationDto mine(Long userId) {
        BreederVerification v = verificationRepository.findByUserId(userId)
                .orElseThrow(() -> ApiException.notFound("Brak złożonej weryfikacji."));
        return VerificationDto.from(v, docsOf(v.getId()));
    }

    @Transactional(readOnly = true)
    public List<VerificationDto> listByStatus(VerificationStatus status) {
        return verificationRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(v -> VerificationDto.from(v, docsOf(v.getId())))
                .toList();
    }

    @Transactional
    public VerificationDto decide(Long verificationId, Long adminId, DecisionRequest req) {
        BreederVerification v = verificationRepository.findById(verificationId)
                .orElseThrow(() -> ApiException.notFound("Weryfikacja nie istnieje."));
        if (v.getStatus() != VerificationStatus.PENDING) {
            throw ApiException.conflict("ALREADY_DECIDED", "Weryfikacja została już rozpatrzona.");
        }
        Instant now = Instant.now();
        VerificationStatus from = v.getStatus();
        VerificationStatus to = Boolean.TRUE.equals(req.approved()) ? VerificationStatus.APPROVED : VerificationStatus.REJECTED;
        v.setStatus(to);
        v.setDecidedBy(adminId);
        v.setDecidedAt(now);
        v.setRejectionReason(Boolean.TRUE.equals(req.approved()) ? null : req.reason());
        v.setUpdatedAt(now);
        verificationRepository.save(v);

        Instant purgeAfter = now.plus(RETENTION_DAYS, ChronoUnit.DAYS);
        for (VerificationDocument doc : documentRepository.findByVerificationIdOrderByCreatedAtAsc(v.getId())) {
            doc.setPurgeAfter(purgeAfter);
            documentRepository.save(doc);
        }

        userRepository.findById(v.getUserId()).ifPresent(u -> {
            u.setVerifiedBadge(to == VerificationStatus.APPROVED);
            userRepository.save(u);
        });
        history(v.getId(), from.name(), to.name(), req.reason(), adminId);
        log.info("Weryfikacja id={} → {} przez admina {}", v.getId(), to, adminId);
        return VerificationDto.from(v, docsOf(v.getId()));
    }

    @Transactional
    public VerificationDto appeal(Long userId, AppealRequest req) {
        BreederVerification v = verificationRepository.findByUserId(userId)
                .orElseThrow(() -> ApiException.notFound("Brak weryfikacji do odwołania."));
        if (v.getStatus() != VerificationStatus.REJECTED) {
            throw ApiException.conflict("NOT_REJECTED", "Odwołanie możliwe tylko po odrzuceniu weryfikacji.");
        }
        Instant now = Instant.now();
        v.setStatus(VerificationStatus.PENDING);
        v.setAppealMessage(req.message());
        v.setAppealedAt(now);
        v.setUpdatedAt(now);
        verificationRepository.save(v);
        history(v.getId(), VerificationStatus.REJECTED.name(), VerificationStatus.PENDING.name(), "Odwołanie hodowcy", userId);
        return VerificationDto.from(v, docsOf(v.getId()));
    }

    @Transactional(readOnly = true)
    public byte[] downloadDocument(Long documentId, Long requesterId, boolean requesterIsAdmin) {
        VerificationDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> ApiException.notFound("Dokument nie istnieje."));
        BreederVerification v = verificationRepository.findById(doc.getVerificationId())
                .orElseThrow(() -> ApiException.notFound("Weryfikacja nie istnieje."));
        boolean owner = v.getUserId().equals(requesterId);
        if (!owner && !requesterIsAdmin) {
            throw ApiException.forbidden("DOC_ACCESS_DENIED", "Dokument dostępny tylko dla właściciela konta i administratora.");
        }
        accessLogRepository.save(VerificationAccessLog.builder()
                .documentId(documentId).accessedBy(requesterId).action("DOWNLOAD").accessedAt(Instant.now()).build());
        return cryptoService.decrypt(storageService.read(doc.getStoredPath()));
    }

    /** Retencja RODO: usuwa dokumenty 30 dni po decyzji. */
    @Transactional
    public void purgeExpired() {
        List<VerificationDocument> expired = documentRepository.findByPurgeAfterBefore(Instant.now());
        for (VerificationDocument doc : expired) {
            storageService.delete(doc.getStoredPath());
            documentRepository.delete(doc);
            log.info("Retencja RODO: usunięto dokument id={} (30 dni po decyzji).", doc.getId());
        }
    }

    private List<DocumentDto> docsOf(Long verificationId) {
        return documentRepository.findByVerificationIdOrderByCreatedAtAsc(verificationId)
                .stream().map(DocumentDto::from).toList();
    }

    private void history(Long verificationId, String from, String to, String note, Long actorId) {
        historyRepository.save(VerificationHistory.builder()
                .verificationId(verificationId).fromStatus(from).toStatus(to).note(note).actorId(actorId)
                .createdAt(Instant.now()).build());
    }

    private void validate(MultipartFile file) {
        if (file.isEmpty()) throw ApiException.badRequest("FILE_EMPTY", "Jeden z plików jest pusty.");
        if (file.getSize() > MAX_DOC_SIZE) throw ApiException.badRequest("FILE_TOO_LARGE", "Plik " + file.getOriginalFilename() + " przekracza 10 MB.");
        String ct = file.getContentType();
        if (ct == null || !storageService.isAllowedDoc(ct)) {
            throw ApiException.badRequest("FILE_TYPE", "Dozwolone formaty: JPG, PNG, WEBP, PDF.");
        }
    }

    private String sanitize(String name) {
        if (name == null) return "dokument";
        String clean = name.replaceAll("[^\\p{L}\\p{N}._-]", "_");
        return clean.length() > 200 ? clean.substring(clean.length() - 200) : clean;
    }
}
