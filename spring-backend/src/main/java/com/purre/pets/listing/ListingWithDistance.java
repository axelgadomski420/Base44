package com.purre.pets.listing;

import java.math.BigDecimal;

/** Projekcja natywnego zapytania Haversine. */
public interface ListingWithDistance {
    Long getId();
    Long getBreederId();
    String getTitle();
    String getDescription();
    String getSpecies();
    String getBreed();
    BigDecimal getPrice();
    String getCurrency();
    String getCity();
    String getRegion();
    BigDecimal getLatitude();
    BigDecimal getLongitude();
    String getStatus();
    java.time.Instant getFeaturedUntil();
    java.time.Instant getCreatedAt();
    BigDecimal getDistanceKm();
}