package com.purre.pets.breeder;

import java.util.List;

/** 0.5.0 M13: publiczny profil hodowcy — dane, obserwujący, Trust Score, dostępne zwierzaki. */
public record BreederProfileDto(
        Long id,
        String displayName,
        String bio,
        String city,
        String region,
        String avatarUrl,
        String website,
        String instagram,
        boolean verifiedBadge,
        long followerCount,
        boolean followedByMe,
        long activeListings,
        int trustScore,
        List<ListingSummaryDto> listings
) {
}
