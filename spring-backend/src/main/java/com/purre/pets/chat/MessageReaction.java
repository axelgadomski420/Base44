package com.purre.pets.chat;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "message_reactions")
@IdClass(MessageReactionId.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MessageReaction {

    @Id @Column(name = "message_id")
    private Long messageId;

    @Id @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false, length = 8)
    private String emoji;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
