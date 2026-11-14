package com.purre.pets.auth.dto;

import com.purre.pets.user.Role;
import com.purre.pets.user.User;

import java.time.Instant;

public record UserDto(
        Long id, String email, Role role, String displayName, String bio,
        String city, String region, String website, String instagram, String facebook,
        String tiktok, String youtube, String avatarUrl, boolean verifiedBadge,
        Instant boostedUntil, Instant createdAt
) {
    public static UserDto from(User u) {
        return new UserDto(u.getId(), u.getEmail(), u.getRole(), u.getDisplayName(), u.getBio(),
                u.getCity(), u.getRegion(), u.getWebsite(), u.getInstagram(), u.getFacebook(),
                u.getTiktok(), u.getYoutube(), u.getAvatarUrl(), u.isVerifiedBadge(),
                u.getBoostedUntil(), u.getCreatedAt());
    }
}