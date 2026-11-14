package com.purre.pets.community;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "group_post_likes")
@IdClass(PostLikeId.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PostLike {

    @Id @Column(name = "post_id")
    private Long postId;

    @Id @Column(name = "user_id")
    private Long userId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
