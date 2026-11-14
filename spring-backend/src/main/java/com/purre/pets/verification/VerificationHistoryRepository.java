package com.purre.pets.verification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VerificationHistoryRepository extends JpaRepository<VerificationHistory, Long> {
    List<VerificationHistory> findByVerificationIdOrderByCreatedAtDesc(Long verificationId);
}