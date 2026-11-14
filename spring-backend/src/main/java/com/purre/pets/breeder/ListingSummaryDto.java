package com.purre.pets.breeder;

/** Skrócone ogłoszenie na profilu hodowcy. */
public record ListingSummaryDto(
        Long id,
        String title,
        String species,
        String breed,
        String city,
        String listingType,
        String status,
        java.math.BigDecimal price,
        String currency
) {
}
