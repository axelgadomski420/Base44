package com.purre.pets.auth;

import com.purre.pets.auth.dto.*;
import com.purre.pets.common.ApiException;
import com.purre.pets.common.RateLimiter;
import com.purre.pets.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RateLimiter rateLimiter;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        requireRate("register:" + req.email(), 5);
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(req));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        requireRate("login:" + req.email(), 10);
        return authService.login(req);
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal UserPrincipal principal) {
        return authService.me(principal.id());
    }

    private void requireRate(String key, int limit) {
        if (!rateLimiter.allow(key, limit, 60_000)) {
            throw ApiException.tooMany("Zbyt wiele prób. Odczekaj chwilę.");
        }
    }
}