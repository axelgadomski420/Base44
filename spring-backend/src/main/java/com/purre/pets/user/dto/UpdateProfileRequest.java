package com.purre.pets.user.dto;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(min = 2, max = 120) String displayName,
        @Size(max = 500) String bio,
        @Size(max = 120) String city,
        @Size(max = 120) String region,
        @Size(max = 255) String website,
        @Size(max = 255) String instagram,
        @Size(max = 255) String facebook,
        @Size(max = 255) String tiktok,
        @Size(max = 255) String youtube
) {}