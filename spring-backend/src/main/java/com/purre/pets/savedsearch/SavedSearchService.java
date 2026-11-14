package com.purre.pets.savedsearch;

import com.purre.pets.common.ApiException;
import com.purre.pets.listing.Listing;
import com.purre.pets.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class SavedSearchService {

    private final SavedSearchRepository repository;
    private final NotificationService notificationService;

    @Transactional
    public SavedSearch create(Long userId, SavedSearch s) {
        if (s.getName() == null || s.getName().isBlank()) {
            throw ApiException.badRequest("BAD_NAME", "Podaj nazwę wyszukiwania.");
        }
        s.setUserId(userId);
        s.setId(null);
        s.setCreatedAt(Instant.now());
        return repository.save(s);
    }

    @Transactional(readOnly = true)
    public List<SavedSearch> mine(Long userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        SavedSearch s = repository.findById(id).orElseThrow(() -> ApiException.notFound("Wyszukiwanie nie istnieje."));
        if (!s.getUserId().equals(userId)) {
            throw ApiException.forbidden("NOT_OWNER", "To wyszukiwanie nie należy do Ciebie.");
        }
        repository.delete(s);
    }

    /**
     * 0.5.0: po publikacji ogłoszenia powiadamiamy właścicieli pasujących zapisanych wyszukiwań.
     * Dopasowanie w Javie (skala pojedynczych tysięcy wyszukiwań — wystarcza).
     */
    @Transactional
    public void notifyMatching(Listing l) {
        List<SavedSearch> all = repository.findAll();
        for (SavedSearch s : all) {
            if (s.getUserId().equals(l.getBreederId())) continue;
            if (!matches(s, l)) continue;
            notificationService.create(s.getUserId(), "SAVED_SEARCH",
                    "🐾 Nowa oferta pasuje do „" + s.getName() + "”",
                    l.getTitle() + (l.getCity() != null ? " · " + l.getCity() : ""),
                    "/listing/" + l.getId());
        }
    }

    private boolean matches(SavedSearch s, Listing l) {
        if (s.getSpecies() != null && !s.getSpecies().isBlank()
                && !s.getSpecies().equalsIgnoreCase(l.getSpecies().name())) return false;
        if (s.getBreed() != null && !s.getBreed().isBlank()) {
            String breed = s.getBreed().toLowerCase(Locale.ROOT);
            String listingBreed = l.getBreed() == null ? "" : l.getBreed().toLowerCase(Locale.ROOT);
            if (!listingBreed.contains(breed)) return false;
        }
        if (s.getCity() != null && !s.getCity().isBlank()) {
            String city = s.getCity().toLowerCase(Locale.ROOT);
            String listingCity = l.getCity() == null ? "" : l.getCity().toLowerCase(Locale.ROOT);
            if (!listingCity.contains(city)) return false;
        }
        if (s.getListingType() != null && !s.getListingType().isBlank()
                && !s.getListingType().equalsIgnoreCase(l.getListingType().name())) return false;
        if (s.getGender() != null && !s.getGender().isBlank()
                && !s.getGender().equalsIgnoreCase(l.getGender())) return false;
        if (s.getMaxAgeMonths() != null && l.getBirthDate() != null) {
            long months = java.time.temporal.ChronoUnit.MONTHS.between(l.getBirthDate(), java.time.LocalDate.now());
            if (months > s.getMaxAgeMonths()) return false;
        }
        if (s.getMinPrice() != null && (l.getPrice() == null || l.getPrice().compareTo(BigDecimal.valueOf(s.getMinPrice().doubleValue())) < 0)) return false;
        if (s.getMaxPrice() != null && (l.getPrice() == null || l.getPrice().compareTo(BigDecimal.valueOf(s.getMaxPrice().doubleValue())) > 0)) return false;
        return true;
    }
}
