package com.purre.pets.moderation;

import com.purre.pets.common.ApiException;
import com.purre.pets.listing.ListingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Moderacja: użytkownicy zgłaszają ogłoszenia/zachowania; moderator (MODERATOR/ADMIN)
 * rozpatruje kolejkę. PSEUDO_BREEDER i CRUELTY mogą skutkować decyzją admina o roli/weryfikacji.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final ListingRepository listingRepository;

    @Transactional
    public Report create(Long reporterId, Long listingId, Long reportedUserId, String reason, String description) {
        Report.Reason r;
        try {
            r = Report.Reason.valueOf(reason.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("BAD_REASON", "Nieznany powód zgłoszenia.");
        }
        if (listingId == null && reportedUserId == null) {
            throw ApiException.badRequest("BAD_TARGET", "Zgłoszenie musi dotyczyć ogłoszenia lub użytkownika.");
        }
        if (listingId != null && listingRepository.findById(listingId).isEmpty()) {
            throw ApiException.notFound("Zgłaszane ogłoszenie nie istnieje.");
        }
        Report report = reportRepository.save(Report.builder()
                .reporterId(reporterId)
                .listingId(listingId)
                .reportedUserId(reportedUserId)
                .reason(r)
                .description(description)
                .status(Report.Status.PENDING)
                .createdAt(Instant.now())
                .build());
        log.info("Zgłoszenie id={} typ={} reporter={}", report.getId(), r, reporterId);
        return report;
    }

    @Transactional(readOnly = true)
    public Page<Report> queue(Report.Status status, int page, int size) {
        return reportRepository.findByStatusOrderByCreatedAtDesc(status, PageRequest.of(page, Math.min(size, 50)));
    }

    @Transactional
    public Report resolve(Long moderatorId, Long reportId, String note, boolean upheld) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> ApiException.notFound("Zgłoszenie nie istnieje."));
        if (report.getStatus() != Report.Status.PENDING) {
            throw ApiException.conflict("ALREADY_RESOLVED", "Zgłoszenie jest już rozpatrzone.");
        }
        report.setStatus(upheld ? Report.Status.RESOLVED : Report.Status.DISMISSED);
        report.setResolvedBy(moderatorId);
        report.setResolutionNote(note);
        report.setResolvedAt(Instant.now());
        Report saved = reportRepository.save(report);
        log.info("Zgłoszenie id={} {} przez moderatora {}", reportId, saved.getStatus(), moderatorId);
        return saved;
    }

    @Transactional(readOnly = true)
    public long pendingCount() {
        return reportRepository.countByStatus(Report.Status.PENDING);
    }
}