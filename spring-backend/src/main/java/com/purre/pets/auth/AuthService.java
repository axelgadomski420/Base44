package com.purre.pets.auth;

import com.purre.pets.common.ApiException;
import com.purre.pets.coins.Wallet;
import com.purre.pets.coins.WalletRepository;
import com.purre.pets.auth.dto.*;
import com.purre.pets.security.JwtService;
import com.purre.pets.security.TotpService;
import com.purre.pets.user.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TotpService totpService;
    private final SessionService sessionService;

    @Transactional
    public AuthResponse register(RegisterRequest req, String userAgent, String ip) {
        if (req.role() == Role.ADMIN) {
            throw ApiException.forbidden("ROLE_NOT_ALLOWED", "Rejestracja z rolą ADMIN jest niedostępna.");
        }
        if (userRepository.existsByEmailIgnoreCase(req.email())) {
            throw ApiException.conflict("EMAIL_TAKEN", "Konto z tym adresem e-mail już istnieje.");
        }
        User user = User.builder()
                .email(req.email().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(req.password()))
                .role(req.role())
                .displayName(req.displayName().trim())
                .bio(req.bio())
                .city(req.city())
                .region(req.region())
                .verifiedBadge(false)
                .totpEnabled(false)
                .createdAt(Instant.now())
                .build();
        user = userRepository.save(user);
        walletRepository.save(Wallet.builder().userId(user.getId()).balance(0).version(0L).build());
        log.info("Zarejestrowano użytkownika id={} rolę={}", user.getId(), user.getRole());
        return token(user, userAgent, ip);
    }

    @Transactional
    public AuthResponse login(LoginRequest req, String userAgent, String ip) {
        User user = userRepository.findByEmailIgnoreCase(req.email().trim())
                .orElseThrow(() -> ApiException.unauthorized("Nieprawidłowy e-mail lub hasło."));
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Nieprawidłowy e-mail lub hasło.");
        }
        if (user.isTotpEnabled()) {
            if (req.totpCode() == null || req.totpCode().isBlank()) {
                return new AuthResponse(null, null, null, true);
            }
            totpService.verifyOrThrow(user.getTotpSecret(), req.totpCode());
        }
        return token(user, userAgent, ip);
    }

    /** Rotacja refresh tokenu: stara sesja wygasa, powstaje nowa. */
    @Transactional
    public AuthResponse refresh(String refreshToken, String userAgent, String ip) {
        Session s = sessionService.validate(refreshToken);
        sessionService.revoke(s);
        User user = userRepository.findById(s.getUserId())
                .orElseThrow(() -> ApiException.unauthorized("Konto nie istnieje."));
        return token(user, userAgent, ip);
    }

    @Transactional
    public void logout(String refreshToken) {
        try {
            sessionService.revoke(sessionService.validate(refreshToken));
        } catch (ApiException ignored) {
            // sesja już nieważna — traktujemy logout jako wykonany
        }
    }

    // --- 2FA (TOTP) ---

    @Transactional
    public TwoFaSetupResponse setup2fa(Long userId) {
        User user = userOrThrow(userId);
        if (user.isTotpEnabled()) throw ApiException.conflict("ALREADY_ENABLED", "2FA jest już aktywne.");
        String secret = totpService.generateSecret();
        user.setTotpSecret(secret);
        userRepository.save(user);
        return new TwoFaSetupResponse(secret, totpService.otpauthUri(secret, user.getEmail()));
    }

    @Transactional
    public void enable2fa(Long userId, String code) {
        User user = userOrThrow(userId);
        if (user.isTotpEnabled()) throw ApiException.conflict("ALREADY_ENABLED", "2FA jest już aktywne.");
        totpService.verifyOrThrow(user.getTotpSecret(), code);
        user.setTotpEnabled(true);
        userRepository.save(user);
        log.info("Włączono 2FA dla user={}", userId);
    }

    @Transactional
    public void disable2fa(Long userId, String code) {
        User user = userOrThrow(userId);
        if (!user.isTotpEnabled()) throw ApiException.badRequest("NOT_ENABLED", "2FA nie jest aktywne.");
        totpService.verifyOrThrow(user.getTotpSecret(), code);
        user.setTotpEnabled(false);
        user.setTotpSecret(null);
        userRepository.save(user);
        log.info("Wyłączono 2FA dla user={}", userId);
    }

    @Transactional(readOnly = true)
    public boolean status2fa(Long userId) {
        return userOrThrow(userId).isTotpEnabled();
    }

    private User userOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Użytkownik nie istnieje."));
    }

    private AuthResponse token(User user, String userAgent, String ip) {
        String refresh = sessionService.create(user.getId(), userAgent, ip);
        String access = jwtService.generate(user.getId(), user.getEmail(), user.getRole());
        return new AuthResponse(access, refresh, UserDto.from(user), false);
    }
}