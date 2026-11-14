package com.purre.pets.ads;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "ad_impressions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AdImpression {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campaign_id", nullable = false)
    private Long campaignId;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false, length = 40)
    private String placement;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}