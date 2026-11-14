package com.purre.pets.verification;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** Historia zmian statusu weryfikacji (w tym odwołania). */
@Entity
@Table(name = "verification_history")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VerificationHistory {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "verification_id", nullable = false)
    private Long verificationId;

    @Column(name = "from_status", length = 20)
    private String fromStatus;

    @Column(name = "to_status", nullable = false, length = 20)
    private String toStatus;

    @Column(length = 1000)
    private String note;

    @Column(name = "actor_id")
    private Long actorId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}