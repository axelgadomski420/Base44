package com.purre.pets.listing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ListingMediaInput(
        @NotBlank @Size(max = 500) String url,
        @NotBlank String mediaType,
        @Size(max = 60) String tag,
        boolean isCover
) {}