package com.purre.pets.ads;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "ad_campaigns")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AdCampaign {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "advertiser_id")
    private Long advertiserId;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "target_url", nullable = false, length = 500)
    private String targetUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AdType type;

    @Column(name = "price_coins")
    private Integer priceCoins;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "active_from", nullable = false)
    private Instant activeFrom;

    @Column(name = "active_until", nullable = false)
    private Instant activeUntil;

    @Column(nullable = false)
    private long impressions;

    @Column(nullable = false)
    private long clicks;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public enum AdType { SPONSORED_LISTING, PARTNER, ADSENSE }
}
