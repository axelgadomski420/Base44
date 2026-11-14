package com.purre.pets.coins;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Ledger append-only: saldo portfela = suma księgi. Klucz (user, reason, reference, type)
 * gwarantuje exactly-once nawet przy wyścigu dwóch replik.
 */
@Entity
@Table(name = "coin_transactions", uniqueConstraints = {
        @UniqueConstraint(name = "uq_ledger", columnNames = {"user_id", "reason", "reference_id", "type"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CoinTransaction {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TxType type;

    @Column(nullable = false)
    private int amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CoinReason reason;

    @Column(name = "reference_id", nullable = false, length = 100)
    private String referenceId;

    @Column(name = "balance_after", nullable = false)
    private int balanceAfter;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}