package com.purre.pets.auth;

import com.purre.pets.auth.dto.*;
import com.purre.pets.common.ApiException;
import com.purre.pets.common.RateLimiter;
import com.purre.pets.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final SessionService sessionService;
    private final RateLimiter rateLimiter;

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest req, jakarta.servlet.http.HttpServletRequest http) {
        requireRate("register:" + req.email(), 5);
        return authService.register(req, ua(http), ip(http));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req, jakarta.servlet.http.HttpServletRequest http) {
        requireRate("login:" + req.email(), 10);
        return authService.login(req, ua(http), ip(http));
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest req, jakarta.servlet.http.HttpServletRequest http) {
        requireRate("refresh", 30);
        return authService.refresh(req.refreshToken(), ua(http), ip(http));
    }

    @PostMapping("/logout")
    public Map<String, String> logout(@Valid @RequestBody RefreshRequest req) {
        authService.logout(req.refreshToken());
        return Map.of("status", "ok");
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal UserPrincipal principal) {
        return authService.me(principal.id());
    }

    // --- 2FA ---

    @GetMapping("/2fa/status")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Boolean> status2fa(@AuthenticationPrincipal UserPrincipal principal) {
        return Map.of("enabled", authService.status2fa(principal.id()));
    }

    @PostMapping("/2fa/setup")
    @PreAuthorize("isAuthenticated()")
    public TwoFaSetupResponse setup2fa(@AuthenticationPrincipal UserPrincipal principal) {
        return authService.setup2fa(principal.id());
    }

    @PostMapping("/2fa/enable")
    @PreAuthorize("isAuthenticated()")
    public Map<String, String> enable2fa(@AuthenticationPrincipal UserPrincipal principal,
                                         @Valid @RequestBody TwoFaCodeRequest req) {
        authService.enable2fa(principal.id(), req.code());
        return Map.of("status", "enabled");
    }

    @PostMapping("/2fa/disable")
    @PreAuthorize("isAuthenticated()")
    public Map<String, String> disable2fa(@AuthenticationPrincipal UserPrincipal principal,
                                          @Valid @RequestBody TwoFaCodeRequest req) {
        authService.disable2fa(principal.id(), req.code());
        return Map.of("status", "disabled");
    }

    // --- Sesje ---

    @GetMapping("/sessions")
    @PreAuthorize("isAuthenticated()")
    public List<SessionDto> sessions(@AuthenticationPrincipal UserPrincipal principal) {
        return sessionService.activeOf(principal.id()).stream().map(SessionDto::from).toList();
    }

    @DeleteMapping("/sessions/{id}")
    @PreAuthorize("isAuthenticated()")
    public Map<String, String> revokeSession(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        Session s = sessionService.activeOf(principal.id()).stream()
                .filter(x -> x.getId().equals(id)).findFirst()
                .orElseThrow(() -> ApiException.notFound("Nie znaleziono sesji."));
        sessionService.revoke(s);
        return Map.of("status", "revoked");
    }

    @PostMapping("/sessions/revoke-others")
    @PreAuthorize("isAuthenticated()")
    public Map<String, String> revokeOthers(@AuthenticationPrincipal UserPrincipal principal,
                                            @Valid @RequestBody RefreshRequest req) {
        Session current = sessionService.validate(req.refreshToken());
        sessionService.revokeAllOthers(principal.id(), current.getId());
        return Map.of("status", "ok");
    }

    private void requireRate(String key, int limit) {
        if (!rateLimiter.allow(key, limit, 60_000)) {
            throw ApiException.tooMany("Zbyt wiele prób. Odczekaj chwilę.");
        }
    }

    private String ua(jakarta.servlet.http.HttpServletRequest http) {
        return http.getHeader("User-Agent");
    }

    private String ip(jakarta.servlet.http.HttpServletRequest http) {
        String fwd = http.getHeader("X-Forwarded-For");
        return fwd != null && !fwd.isBlank() ? fwd.split(",")[0].trim() : http.getRemoteAddr();
    }
}