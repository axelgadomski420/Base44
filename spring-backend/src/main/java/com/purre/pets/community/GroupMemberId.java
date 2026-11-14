package com.purre.pets.community;

import lombok.*;

import java.io.Serializable;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
public class GroupMemberId implements Serializable {
    private Long groupId;
    private Long userId;
}
