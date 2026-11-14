package com.purre.pets.listing.dto;

import com.purre.pets.listing.Listing;
import com.purre.pets.listing.ListingMedia;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ListingDto(
        Long id, Long breederId, String title, String description, String species, String breed,
        String listingType,
        BigDecimal price, String currency, String city, String region,
        BigDecimal latitude, BigDecimal longitude, String status,
        Instant featuredUntil, Instant createdAt,
        BigDecimal distanceKm,
        List<MediaDto> media
) {
    public record MediaDto(Long id, String mediaType, String url, String tag, int position, boolean cover) {
        public static MediaDto from(ListingMedia m) {
            return new MediaDto(m.getId(), m.getMediaType().name(), m.getUrl(), m.getTag(), m.getPosition(), m.isCover());
        }
    }

    public static ListingDto from(Listing l, List<ListingMedia> media, BigDecimal distanceKm) {
        return new ListingDto(l.getId(), l.getBreederId(), l.getTitle(), l.getDescription(),
                l.getSpecies().name(), l.getBreed(), l.getListingType().name(),
                l.getPrice(), l.getCurrency(), l.getCity(), l.getRegion(),
                l.getLatitude(), l.getLongitude(), l.getStatus().name(),
                l.getFeaturedUntil(), l.getCreatedAt(), distanceKm,
                media.stream().map(MediaDto::from).toList());
    }
}