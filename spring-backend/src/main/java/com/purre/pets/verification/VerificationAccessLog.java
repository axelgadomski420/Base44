package com.purre.pets.verification;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** Log dostępu do dokumentów (RODO: kto i kiedy otworzył dokument). */
@Entity
@Table(name = "verification_access_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VerificationAccessLog {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "accessed_by", nullable = false)
    private Long accessedBy;

    @Column(name = "action", nullable = false, length = 20)
    private String action;

    @Column(name = "accessed_at", nullable = false)
    private Instant accessedAt;
}