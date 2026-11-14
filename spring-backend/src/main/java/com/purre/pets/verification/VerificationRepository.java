package com.purre.pets.verification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VerificationRepository extends JpaRepository<BreederVerification, Long> {
    Optional<BreederVerification> findByUserId(Long userId);
    List<BreederVerification> findByStatusOrderByCreatedAtDesc(VerificationStatus status);
}