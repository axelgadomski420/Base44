package com.purre.pets.follow;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "follows")
@Getter
@Setter
@NoArgsConstructor
public class Follow {

    @EmbeddedId
    private FollowId id;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Follow(Long followerId, Long breederId) {
        this.id = new FollowId(followerId, breederId);
    }
}
