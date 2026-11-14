package com.purre.pets.listing;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface ListingRepository extends JpaRepository<Listing, Long> {

    Page<Listing> findByStatusOrderByFeaturedUntilDescCreatedAtDesc(ListingStatus status, Pageable pageable);
    Page<Listing> findByBreederIdOrderByCreatedAtDesc(Long breederId, Pageable pageable);
    long countByBreederIdAndStatus(Long breederId, ListingStatus status);

    /**
     * Wyszukiwanie po odległości — Haversine w czystym SQL (MySQL, bez PostGIS).
     * 0.5.0: filtry płci i maksymalnego wieku (miesiące).
     */
    @Query(value = """
            SELECT l.*,
                   (6371 * acos(
                       LEAST(1.0,
                       cos(radians(:lat)) * cos(radians(l.latitude)) *
                       cos(radians(l.longitude) - radians(:lng)) +
                       sin(radians(:lat)) * sin(radians(l.latitude)))
                   )) AS distance_km
            FROM listings l
            WHERE l.status = 'ACTIVE'
              AND (:species IS NULL OR l.species = :species)
              AND (:breed IS NULL OR l.breed LIKE CONCAT('%', :breed, '%'))
              AND (:city IS NULL OR l.city LIKE CONCAT('%', :city, '%'))
              AND (:listingType IS NULL OR l.listing_type = :listingType)
              AND (:gender IS NULL OR l.gender = :gender)
              AND (:maxAgeMonths IS NULL OR l.birth_date IS NULL
                   OR l.birth_date >= DATE_SUB(NOW(), INTERVAL :maxAgeMonths MONTH))
              AND (:minPrice IS NULL OR l.price >= :minPrice)
              AND (:maxPrice IS NULL OR l.price <= :maxPrice)
            HAVING distance_km <= :radiusKm
            ORDER BY distance_km ASC
            """,
            countQuery = """
            SELECT COUNT(*) FROM (
                SELECT l.id,
                       (6371 * acos(
                           LEAST(1.0,
                           cos(radians(:lat)) * cos(radians(l.latitude)) *
                           cos(radians(l.longitude) - radians(:lng)) +
                           sin(radians(:lat)) * sin(radians(l.latitude)))
                       )) AS distance_km
                FROM listings l
                WHERE l.status = 'ACTIVE'
                  AND (:species IS NULL OR l.species = :species)
                  AND (:breed IS NULL OR l.breed LIKE CONCAT('%', :breed, '%'))
                  AND (:city IS NULL OR l.city LIKE CONCAT('%', :city, '%'))
                  AND (:listingType IS NULL OR l.listing_type = :listingType)
                  AND (:gender IS NULL OR l.gender = :gender)
                  AND (:maxAgeMonths IS NULL OR l.birth_date IS NULL
                       OR l.birth_date >= DATE_SUB(NOW(), INTERVAL :maxAgeMonths MONTH))
                  AND (:minPrice IS NULL OR l.price >= :minPrice)
                  AND (:maxPrice IS NULL OR l.price <= :maxPrice)
                HAVING distance_km <= :radiusKm
            ) t
            """,
            nativeQuery = true)
    List<ListingWithDistance> searchNearby(@Param("lat") double lat,
                                           @Param("lng") double lng,
                                           @Param("radiusKm") double radiusKm,
                                           @Param("species") String species,
                                           @Param("breed") String breed,
                                           @Param("city") String city,
                                           @Param("listingType") String listingType,
                                           @Param("gender") String gender,
                                           @Param("maxAgeMonths") Integer maxAgeMonths,
                                           @Param("minPrice") BigDecimal minPrice,
                                           @Param("maxPrice") BigDecimal maxPrice,
                                           Pageable pageable);

    /** 0.4.0: podpowiedzi ras w czasie rzeczywistym. */
    @Query(value = """
            SELECT DISTINCT l.breed FROM listings l
            WHERE l.status = 'ACTIVE' AND l.breed IS NOT NULL
              AND LOWER(l.breed) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY l.breed
            LIMIT 8
            """, nativeQuery = true)
    List<String> suggestBreeds(@Param("q") String q);

    /** 0.4.0: podpowiedzi miast w czasie rzeczywistym. */
    @Query(value = """
            SELECT DISTINCT l.city FROM listings l
            WHERE l.status = 'ACTIVE' AND l.city IS NOT NULL
              AND LOWER(l.city) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY l.city
            LIMIT 8
            """, nativeQuery = true)
    List<String> suggestCities(@Param("q") String q);

    /** HoloFeed (faza 3): ogłoszenia z wideo, wyróżnione najpierw. */
    @Query(value = """
            SELECT DISTINCT l.* FROM listings l
            JOIN listing_media m ON m.listing_id = l.id AND m.media_type = 'VIDEO'
            WHERE l.status = 'ACTIVE'
            ORDER BY (l.featured_until IS NOT NULL AND l.featured_until > NOW()) DESC, l.created_at DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Listing> findFeed(@Param("limit") int limit);

    /** Smart Match: kandydaci do scoringu. */
    List<Listing> findByStatus(ListingStatus status, Pageable pageable);
}
