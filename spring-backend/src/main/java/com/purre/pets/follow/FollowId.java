package com.purre.pets.follow;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class FollowId implements Serializable {
    private Long followerId;
    private Long breederId;
}
