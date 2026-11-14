package com.purre.pets.auth;

import com.purre.pets.common.ApiException;
import com.purre.pets.coins.Wallet;
import com.purre.pets.coins.WalletRepository;
import com.purre.pets.auth.dto.*;
import com.purre.pets.security.JwtService;
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

    @Transactional
    public AuthResponse register(RegisterRequest req) {
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
                .createdAt(Instant.now())
                .build();
        user = userRepository.save(user);
        walletRepository.save(Wallet.builder().userId(user.getId()).balance(0).version(0L).build());
        log.info("Zarejestrowano użytkownika id={} rolę={}", user.getId(), user.getRole());
        return token(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmailIgnoreCase(req.email().trim())
                .orElseThrow(() -> ApiException.unauthorized("Nieprawidłowy e-mail lub hasło."));
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Nieprawidłowy e-mail lub hasło.");
        }
        return token(user);
    }

    @Transactional(readOnly = true)
    public UserDto me(Long userId) {
        return UserDto.from(userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Użytkownik nie istnieje.")));
    }

    private AuthResponse token(User user) {
        String token = jwtService.generate(user.getId(), user.getEmail(), user.getRole());
        return new AuthResponse(token, UserDto.from(user));
    }
}