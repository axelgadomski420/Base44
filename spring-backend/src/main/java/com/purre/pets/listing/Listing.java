package com.purre.pets.listing;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "listings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Listing {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "breeder_id", nullable = false)
    private Long breederId;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Species species;

    @Column(length = 120)
    private String breed;

    @Enumerated(EnumType.STRING)
    @Column(name = "listing_type", nullable = false, length = 10)
    private ListingType listingType;

    @Column(precision = 10, scale = 2)
    private BigDecimal price;

    @Column(length = 10)
    private String currency;

    @Column(length = 120)
    private String city;

    @Column(length = 120)
    private String region;

    @Column(name = "latitude", nullable = false, precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(name = "longitude", nullable = false, precision = 9, scale = 6)
    private BigDecimal longitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ListingStatus status;

    @Column(name = "featured_until")
    private Instant featuredUntil;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}