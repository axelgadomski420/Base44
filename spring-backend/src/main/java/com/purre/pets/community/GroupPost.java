package com.purre.pets.community;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "group_posts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GroupPost {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_id", nullable = false)
    private Long groupId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, columnDefinition = "VARCHAR(4000)")
    private String content;

    /** 0.5.0: ankieta — pytanie (opcje w poll_options). */
    @Column(name = "poll_question", length = 300)
    private String pollQuestion;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
