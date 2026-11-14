package com.purre.pets.savedsearch;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "saved_searches")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SavedSearch {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 10)
    private String species;

    @Column(length = 120)
    private String breed;

    @Column(length = 120)
    private String city;

    @Column(name = "listing_type", length = 10)
    private String listingType;

    @Column(length = 10)
    private String gender;

    @Column(name = "max_age_months")
    private Integer maxAgeMonths;

    @Column(name = "min_price", precision = 10, scale = 2)
    private BigDecimal minPrice;

    @Column(name = "max_price", precision = 10, scale = 2)
    private BigDecimal maxPrice;

    @Column(name = "radius_km", nullable = false)
    private double radiusKm;

    @Column(length = 20)
    private String sort;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
