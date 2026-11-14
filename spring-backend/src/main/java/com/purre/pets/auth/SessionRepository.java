package com.purre.pets.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findByRefreshTokenHash(String hash);
    List<Session> findByUserIdAndRevokedFalseAndExpiresAtAfter(Long userId, Instant now);
    List<Session> findByUserIdAndRevokedFalse(Long userId);
}