package com.purre.pets.community;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "group_members")
@IdClass(GroupMemberId.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GroupMember {

    @Id @Column(name = "group_id")
    private Long groupId;

    @Id @Column(name = "user_id")
    private Long userId;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;
}
