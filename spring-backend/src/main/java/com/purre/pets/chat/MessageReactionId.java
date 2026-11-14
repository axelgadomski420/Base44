package com.purre.pets.chat;

import lombok.*;

import java.io.Serializable;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
public class MessageReactionId implements Serializable {
    private Long messageId;
    private Long userId;
}
