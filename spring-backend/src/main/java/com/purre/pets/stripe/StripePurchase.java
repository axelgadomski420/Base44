package com.purre.pets.stripe;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "stripe_purchases")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StripePurchase {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false, unique = true, length = 255)
    private String sessionId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "pack_id", nullable = false, length = 40)
    private String packId;

    @Column(nullable = false)
    private int coins;

    @Column(name = "amount_grosze", nullable = false)
    private long amountGrosze;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PurchaseStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    public enum PurchaseStatus { PENDING, COMPLETED, FAILED }
}