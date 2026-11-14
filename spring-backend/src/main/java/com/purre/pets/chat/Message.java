package com.purre.pets.chat;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "messages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Message {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    /** 0.5.0: wiadomość na którą odpowiadamy. */
    @Column(name = "reply_to_id")
    private Long replyToId;

    @Column(nullable = false, columnDefinition = "VARCHAR(4000)")
    private String content;

    /** 0.4.0: załącznik multimedialny (URL z /api/media/... — ten sam storage co ogłoszenia). */
    @Column(name = "attachment_url", length = 500)
    private String attachmentUrl;

    /** IMAGE | VIDEO | FILE */
    @Column(name = "attachment_type", length = 20)
    private String attachmentType;

    @Column(name = "attachment_name", length = 200)
    private String attachmentName;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    /** 0.5.0: edycja (tylko autor). */
    @Column(name = "edited_at")
    private Instant editedAt;

    /** 0.5.0: miękkie usunięcie — treść znika, rekord zostaje (historia rozmowy). */
    @Column(name = "deleted_at")
    private Instant deletedAt;
}
