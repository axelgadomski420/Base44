package com.purre.pets.match;

import com.purre.pets.listing.Listing;
import com.purre.pets.listing.ListingDto;
import com.purre.pets.listing.ListingMediaRepository;
import com.purre.pets.listing.ListingRepository;
import com.purre.pets.listing.ListingStatus;
import com.purre.pets.listing.dto.ListingDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

/**
 * Smart Match (faza 3, wzorzec paw-match): dopasowanie ogłoszeń do preferencji użytkownika.
 * Scoring: gatunek 40, rasa 30, miasto 15, wyróżnienie 10, świeżość 5. Bez profilowania RODO —
 * używamy wyłącznie preferencji podanych jawnie przez użytkownika.
 */
@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchPreferenceRepository preferenceRepository;
    private final ListingRepository listingRepository;
    private final ListingMediaRepository mediaRepository;

    @Transactional
    public MatchPreference save(Long userId, MatchPreference req) {
        MatchPreference pref = preferenceRepository.findById(userId).orElseGet(() ->
                MatchPreference.builder().userId(userId).build());
        pref.setSpecies(req.getSpecies());
        pref.setBreed(req.getBreed());
        pref.setCity(req.getCity());
        pref.setMaxRadiusKm(req.getMaxRadiusKm() <= 0 ? 50 : req.getMaxRadiusKm());
        pref.setUpdatedAt(Instant.now());
        return preferenceRepository.save(pref);
    }

    @Transactional(readOnly = true)
    public MatchPreference get(Long userId) {
        return preferenceRepository.findById(userId).orElseGet(() ->
                MatchPreference.builder().userId(userId).maxRadiusKm(50).updatedAt(Instant.now()).build());
    }

    @Transactional(readOnly = true)
    public List<MatchResult> match(Long userId) {
        MatchPreference pref = get(userId);
        var candidates = listingRepository.findByStatus(ListingStatus.ACTIVE, PageRequest.of(0, 300));
        record Scored(Listing l, int score) {}
        List<Scored> scored = candidates.stream()
                .filter(l -> l.getBreederId() != null && !l.getBreederId().equals(userId))
                .map(l -> {
                    int s = 0;
                    if (pref.getSpecies() != null && !pref.getSpecies().isBlank()
                            && l.getSpecies().name().equalsIgnoreCase(pref.getSpecies())) s += 40;
                    if (pref.getBreed() != null && !pref.getBreed().isBlank() && l.getBreed() != null
                            && l.getBreed().equalsIgnoreCase(pref.getBreed())) s += 30;
                    if (pref.getCity() != null && !pref.getCity().isBlank() && l.getCity() != null
                            && l.getCity().equalsIgnoreCase(pref.getCity())) s += 15;
                    if (l.getFeaturedUntil() != null && l.getFeaturedUntil().isAfter(Instant.now())) s += 10;
                    long ageDays = java.time.Duration.between(l.getCreatedAt(), Instant.now()).toDays();
                    if (ageDays <= 7) s += 5;
                    return new Scored(l, s);
                })
                .filter(x -> x.score() > 0)
                .sorted(Comparator.comparingInt(Scored::score).reversed())
                .limit(20)
                .toList();
        return scored.stream()
                .map(x -> new MatchResult(
                        ListingDto.from(x.l(), mediaRepository.findByListingIdOrderByPositionAsc(x.l().getId()), null),
                        x.score()))
                .toList();
    }

    public record MatchResult(ListingDto listing, int score) {}
}