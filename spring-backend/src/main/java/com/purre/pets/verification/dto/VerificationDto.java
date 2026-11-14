package com.purre.pets.verification.dto;

import com.purre.pets.verification.BreederVerification;
import com.purre.pets.verification.VerificationStatus;

import java.time.Instant;
import java.util.List;

public record VerificationDto(
        Long id, Long userId, VerificationStatus status, String kennelNumber, String kennelUnion,
        Integer riskScore, String aiAnalysis, String rejectionReason,
        Instant decidedAt, String appealMessage, Instant appealedAt, Instant createdAt,
        List<DocumentDto> documents
) {
    public static VerificationDto from(BreederVerification v, List<DocumentDto> docs) {
        return new VerificationDto(v.getId(), v.getUserId(), v.getStatus(), v.getKennelNumber(), v.getKennelUnion(),
                v.getRiskScore(), v.getAiAnalysis(), v.getRejectionReason(),
                v.getDecidedAt(), v.getAppealMessage(), v.getAppealedAt(), v.getCreatedAt(), docs);
    }
}