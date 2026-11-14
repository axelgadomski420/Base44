package com.purre.pets.stripe;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StripePurchaseRepository extends JpaRepository<StripePurchase, Long> {
    Optional<StripePurchase> findBySessionId(String sessionId);
    List<StripePurchase> findByUserIdOrderByCreatedAtDesc(Long userId);
}