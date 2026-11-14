package com.purre.pets.arcade;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "arcade_scores")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ArcadeScore {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 40)
    private String game;

    @Column(nullable = false)
    private int score;

    @Column(name = "duration_seconds", nullable = false)
    private int durationSeconds;

    @Column(name = "coins_awarded", nullable = false)
    private int coinsAwarded;

    @Column(name = "xp_awarded", nullable = false)
    private int xpAwarded;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}