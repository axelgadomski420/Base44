package com.purre.pets.verification;

import com.purre.pets.verification.dto.*;
import com.purre.pets.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/verification")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class VerificationController {

    private final VerificationService verificationService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public VerificationDto submit(@AuthenticationPrincipal UserPrincipal principal,
                                  @RequestPart("data") @Valid SubmitVerificationRequest data,
                                  @RequestPart("files") List<MultipartFile> files) {
        return verificationService.submit(principal.id(), data, files);
    }

    @GetMapping("/me")
    public VerificationDto mine(@AuthenticationPrincipal UserPrincipal principal) {
        return verificationService.mine(principal.id());
    }

    @PostMapping("/appeal")
    public VerificationDto appeal(@AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody AppealRequest req) {
        return verificationService.appeal(principal.id(), req);
    }

    @GetMapping("/documents/{docId}")
    public ResponseEntity<byte[]> document(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long docId) {
        boolean admin = principal.role().name().equals("ADMIN");
        byte[] bytes = verificationService.downloadDocument(docId, principal.id(), admin);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=dokument-" + docId)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(bytes);
    }
}