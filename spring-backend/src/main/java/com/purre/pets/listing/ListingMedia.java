package com.purre.pets.listing;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "listing_media")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ListingMedia {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "listing_id", nullable = false)
    private Long listingId;

    @Enumerated(EnumType.STRING)
    @Column(name = "media_type", nullable = false, length = 10)
    private MediaType mediaType;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(length = 60)
    private String tag;

    @Column(nullable = false)
    private int position;

    @Column(name = "is_cover", nullable = false)
    private boolean cover;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public enum MediaType { IMAGE, VIDEO }
}