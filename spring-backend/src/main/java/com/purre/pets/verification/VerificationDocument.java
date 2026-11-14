package com.purre.pets.verification;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "verification_documents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VerificationDocument {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "verification_id", nullable = false)
    private Long verificationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "doc_type", nullable = false, length = 40)
    private DocType docType;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "stored_path", nullable = false, length = 500)
    private String storedPath;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "ocr_text", columnDefinition = "MEDIUMTEXT")
    private String ocrText;

    @Column(name = "purge_after")
    private Instant purgeAfter;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}