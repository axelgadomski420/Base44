package com.purre.pets.arcade;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "daily_rewards", uniqueConstraints = @UniqueConstraint(name = "uq_daily", columnNames = {"user_id", "reward_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DailyReward {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "reward_date", nullable = false)
    private LocalDate rewardDate;

    @Column(nullable = false)
    private int streak;

    @Column(nullable = false)
    private int coins;

    @Column(name = "claimed_at", nullable = false)
    private Instant claimedAt;
}