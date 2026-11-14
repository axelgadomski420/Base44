package com.purre.pets.verification;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "breeder_verifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BreederVerification {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VerificationStatus status;

    @Column(name = "kennel_number", length = 120)
    private String kennelNumber;

    @Column(name = "kennel_union", length = 120)
    private String kennelUnion;

    @Column(name = "risk_score")
    private Integer riskScore;

    @Column(name = "ai_analysis", columnDefinition = "TEXT")
    private String aiAnalysis;

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    @Column(name = "decided_by")
    private Long decidedBy;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "appeal_message", length = 1000)
    private String appealMessage;

    @Column(name = "appealed_at")
    private Instant appealedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}