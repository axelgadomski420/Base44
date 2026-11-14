package com.purre.pets.verification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface VerificationDocumentRepository extends JpaRepository<VerificationDocument, Long> {
    List<VerificationDocument> findByVerificationIdOrderByCreatedAtAsc(Long verificationId);
    List<VerificationDocument> findByPurgeAfterBefore(Instant cutoff);
}