package com.purre.pets.match;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "match_preferences")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MatchPreference {

    @Id
    private Long userId;

    @Column(length = 10)
    private String species;

    @Column(length = 120)
    private String breed;

    @Column(length = 120)
    private String city;

    @Column(name = "max_radius_km", nullable = false)
    private int maxRadiusKm;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}