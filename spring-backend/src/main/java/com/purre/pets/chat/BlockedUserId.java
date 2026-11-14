package com.purre.pets.chat;

import lombok.*;

import java.io.Serializable;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
public class BlockedUserId implements Serializable {
    private Long blockerId;
    private Long blockedId;
}
