package com.purre.pets.auth;

import com.purre.pets.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;

/**
 * Sesje użytkownika: refresh tokeny (rotacja przy każdym odświeżeniu),
 * lista aktywnych urządzeń, zdalne wylogowanie. W bazie tylko SHA-256 tokenu.
 */
@Service
@RequiredArgsConstructor
public class SessionService {

    public static final long TTL_DAYS = 30;
    private final SessionRepository repo;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public String create(Long userId, String userAgent, String ip) {
        byte[] buf = new byte[48];
        random.nextBytes(buf);
        String token = HexFormat.of().formatHex(buf);
        Instant now = Instant.now();
        repo.save(Session.builder()
                .userId(userId)
                .refreshTokenHash(sha256(token))
                .userAgent(truncate(userAgent, 255))
                .ip(truncate(ip, 45))
                .createdAt(now).lastUsedAt(now)
                .expiresAt(now.plus(Duration.ofDays(TTL_DAYS)))
                .revoked(false)
                .build());
        return token;
    }

    @Transactional(readOnly = true)
    public Session validate(String token) {
        Session s = repo.findByRefreshTokenHash(sha256(token))
                .orElseThrow(() -> ApiException.unauthorized("Nieprawidłowa sesja."));
        if (s.isRevoked() || s.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.unauthorized("Sesja wygasła — zaloguj się ponownie.");
        }
        return s;
    }

    @Transactional
    public void touch(Session s) {
        s.setLastUsedAt(Instant.now());
        repo.save(s);
    }

    @Transactional
    public void revoke(Session s) {
        s.setRevoked(true);
        repo.save(s);
    }

    @Transactional
    public void revokeAllOthers(Long userId, Long keepSessionId) {
        for (Session s : repo.findByUserIdAndRevokedFalse(userId)) {
            if (!s.getId().equals(keepSessionId)) { s.setRevoked(true); repo.save(s); }
        }
    }

    @Transactional(readOnly = true)
    public List<Session> activeOf(Long userId) {
        return repo.findByUserIdAndRevokedFalseAndExpiresAtAfter(userId, Instant.now());
    }

    public String sha256(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 niedostępny", e);
        }
    }

    private String truncate(String v, int max) {
        if (v == null) return null;
        return v.length() <= max ? v : v.substring(0, max);
    }
}