package com.purre.pets.chat;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "blocked_users")
@IdClass(BlockedUserId.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BlockedUser {

    @Id @Column(name = "blocker_id")
    private Long blockerId;

    @Id @Column(name = "blocked_id")
    private Long blockedId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
