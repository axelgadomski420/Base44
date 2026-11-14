package com.purre.pets.user;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Column(length = 500)
    private String bio;

    private String city;
    private String region;
    private String website;
    private String instagram;
    private String facebook;
    private String tiktok;
    private String youtube;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "verified_badge", nullable = false)
    private boolean verifiedBadge;

    @Column(name = "boosted_until")
    private Instant boostedUntil;

    @Column(name = "premium_until")
    private Instant premiumUntil;

    @Column(name = "totp_secret", length = 64)
    private String totpSecret;

    @Column(name = "totp_enabled", nullable = false)
    private boolean totpEnabled;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}