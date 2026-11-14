package com.purre.pets.auth.dto;

import com.purre.pets.auth.Session;

import java.time.Instant;

public record SessionDto(Long id, String userAgent, String ip, Instant createdAt, Instant lastUsedAt) {
    public static SessionDto from(Session s) {
        return new SessionDto(s.getId(), s.getUserAgent(), s.getIp(), s.getCreatedAt(), s.getLastUsedAt());
    }
}