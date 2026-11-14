package com.purre.pets.community;

import lombok.*;

import java.io.Serializable;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
public class PollVoteId implements Serializable {
    private Long postId;
    private Long userId;
}
