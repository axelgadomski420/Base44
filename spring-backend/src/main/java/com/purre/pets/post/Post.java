package com.purre.pets.post;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "posts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Post {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, columnDefinition = "VARCHAR(2000)")
    private String caption;

    /** POST | REEL */
    @Column(name = "post_type", nullable = false, length = 10)
    private String postType;

    /** JSON: [{"url": "/api/media/...", "mediaType": "IMAGE|VIDEO"}] */
    @Column(name = "media_json", columnDefinition = "TEXT")
    private String mediaJson;

    @Column(nullable = false)
    private int likes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public enum PostType { POST, REEL }
}
