package com.purre.pets.listing;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

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

    /** 0.5.0: płeć zwierzaka (MALE / FEMALE). */
    @Column(length = 10)
    private String gender;

    /** 0.5.0: data urodzenia — filtr wieku. */
    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(length = 80)
    private String color;

    @Column(length = 80)
    private String coat;

    @Column(name = "character_desc", columnDefinition = "TEXT")
    private String characterDesc;

    @Column(columnDefinition = "TEXT")
    private String parents;

    @Column
    private boolean pedigree;

    @Column
    private boolean vaccinated;

    @Column
    private boolean chipped;

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

    /** 0.5.0: sponsorowanie ogłoszenia (50 🪙 / 24 h, 200 🪙 / 7 dni). */
    @Column(name = "sponsored_until")
    private Instant sponsoredUntil;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
