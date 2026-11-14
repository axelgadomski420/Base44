package com.purre.pets.community;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "poll_votes")
@IdClass(PollVoteId.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PollVote {

    @Id @Column(name = "post_id")
    private Long postId;

    @Id @Column(name = "user_id")
    private Long userId;

    @Column(name = "option_id", nullable = false)
    private Long optionId;

    @Column(name = "voted_at", nullable = false)
    private Instant votedAt;
}
