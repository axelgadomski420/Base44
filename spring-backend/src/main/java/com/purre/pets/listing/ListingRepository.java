package com.purre.pets.listing;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ListingRepository extends JpaRepository<Listing, Long> {

    Page<Listing> findByStatusOrderByFeaturedUntilDescCreatedAtDesc(ListingStatus status, Pageable pageable);
    Page<Listing> findByBreederIdOrderByCreatedAtDesc(Long breederId, Pageable pageable);
    long countByBreederIdAndStatus(Long breederId, ListingStatus status);

    /**
     * Wyszukiwanie po odległości — wzorzec z nearby-marketplace: Haversine w czystym SQL (MySQL, bez PostGIS).
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
                                           Pageable pageable);
}