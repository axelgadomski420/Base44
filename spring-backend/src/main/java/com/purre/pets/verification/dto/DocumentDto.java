package com.purre.pets.verification.dto;

import com.purre.pets.verification.DocType;
import com.purre.pets.verification.VerificationDocument;

import java.time.Instant;

public record DocumentDto(Long id, DocType docType, String fileName, String contentType, long sizeBytes, Instant createdAt, Instant purgeAfter) {
    public static DocumentDto from(VerificationDocument d) {
        return new DocumentDto(d.getId(), d.getDocType(), d.getFileName(), d.getContentType(), d.getSizeBytes(), d.getCreatedAt(), d.getPurgeAfter());
    }
}