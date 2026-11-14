package com.purre.pets.listing.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;

public record CreateListingRequest(
        @NotBlank @Size(min = 5, max = 160) String title,
        @NotBlank @Size(min = 20, max = 5000) String description,
        @NotBlank String species,
        @Size(max = 120) String breed,
        @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal price,
        @Size(min = 5, max = 120) String city,
        @Size(max = 120) String region,
        @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
        @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,
        @NotEmpty @Size(min = 6, max = 23, message = "Ogłoszenie wymaga od 6 do 20 zdjęć (plus maks. 3 wideo).")
        List<ListingMediaInput> media
) {}