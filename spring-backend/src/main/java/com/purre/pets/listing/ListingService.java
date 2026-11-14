package com.purre.pets.listing;

import com.purre.pets.common.ApiException;
import com.purre.pets.config.AppProperties;
import com.purre.pets.coins.CoinReason;
import com.purre.pets.coins.CoinService;
import com.purre.pets.verification.VerificationRepository;
import com.purre.pets.verification.VerificationStatus;
import com.purre.pets.listing.dto.*;
import com.purre.pets.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ListingService {

    private static final int MIN_IMAGES = 6;
    private static final int MAX_IMAGES = 20;
    private static final int MAX_VIDEOS = 3;

    private final ListingRepository listingRepository;
    private final ListingMediaRepository mediaRepository;
    private final VerificationRepository verificationRepository;
    private final UserRepository userRepository;
    private final CoinService coinService;
    private final AppProperties props;

    @Transactional
    public ListingDto create(Long breederId, CreateListingRequest req) {
        requireVerifiedBreeder(breederId);

        long images = req.media().stream().filter(m -> "IMAGE".equals(m.mediaType())).count();
        long videos = req.media().stream().filter(m -> "VIDEO".equals(m.mediaType())).count();
        if (images < MIN_IMAGES || images > MAX_IMAGES) {
            throw ApiException.badRequest("PHOTO_COUNT", "Ogłoszenie wymaga od " + MIN_IMAGES + " do " + MAX_IMAGES + " zdjęć (masz " + images + ").");
        }
        if (videos > MAX_VIDEOS) {
            throw ApiException.badRequest("VIDEO_COUNT", "Maksymalnie " + MAX_VIDEOS + " wideo na ogłoszenie.");
        }

        ListingType type = ListingType.SALE;
        if (req.listingType() != null && !req.listingType().isBlank()) {
            try {
                type = ListingType.valueOf(req.listingType().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw ApiException.badRequest("BAD_TYPE", "Typ ogłoszenia: SALE lub ADOPTION.");
            }
        }
        if (type == ListingType.ADOPTION && req.price() != null && req.price().signum() > 0) {
            throw ApiException.badRequest("ADOPTION_PRICE", "Adopcja jest bezpłatna — nie podawaj ceny.");
        }

        Instant now = Instant.now();
        Listing listing = Listing.builder()
                .breederId(breederId)
                .title(req.title().trim())
                .description(req.description().trim())
                .species(Species.valueOf(req.species().toUpperCase()))
                .breed(req.breed())
                .listingType(type)
                .price(req.price())
                .currency("PLN")
                .city(req.city())
                .region(req.region())
                .latitude(req.latitude())
                .longitude(req.longitude())
                .status(ListingStatus.ACTIVE)
                .publishedAt(now)
                .createdAt(now)
                .updatedAt(now)
                .build();
        listing = listingRepository.save(listing);

        int coverCount = 0;
        int position = 0;
        for (ListingMediaInput m : req.media()) {
            boolean cover = m.isCover() && coverCount == 0;
            if (cover) coverCount++;
            mediaRepository.save(ListingMedia.builder()
                    .listingId(listing.getId())
                    .mediaType(ListingMedia.MediaType.valueOf(m.mediaType().toUpperCase()))
                    .url(m.url())
                    .tag(m.tag())
                    .position(position++)
                    .cover(cover)
                    .createdAt(now)
                    .build());
        }
        if (coverCount == 0) {
            mediaRepository.findByListingIdOrderByPositionAsc(listing.getId()).stream()
                    .filter(m -> m.getMediaType() == ListingMedia.MediaType.IMAGE)
                    .findFirst()
                    .ifPresent(first -> { first.setCover(true); mediaRepository.save(first); });
        }

        // Koszt wystawienia: 50 PURRE Coins. Rzut ApiException INSUFFICIENT_COINS wycofuje całą transakcję.
        int newBalance = coinService.spend(breederId, props.getCoins().getListingPublishCost(),
                CoinReason.LISTING_PUBLISH, "listing:" + listing.getId());
        log.info("Ogłoszenie id={} (typ {}) wystawione przez hodowcę {}, saldo po: {}", listing.getId(), type, breederId, newBalance);

        return ListingDto.from(listing, mediaRepository.findByListingIdOrderByPositionAsc(listing.getId()), null);
    }

    @Transactional
    public ListingDto feature(Long breederId, Long listingId) {
        Listing listing = ownedListing(breederId, listingId);
        coinService.spend(breederId, props.getCoins().getListingFeatureCost(),
                CoinReason.LISTING_FEATURE, "feature:" + listingId + ":" + LocalDate.now());
        listing.setFeaturedUntil(Instant.now().plusSeconds(7 * 24 * 3600));
        listing.setUpdatedAt(Instant.now());
        listingRepository.save(listing);
        return ListingDto.from(listing, mediaOf(listingId), null);
    }

    @Transactional
    public int boostProfile(Long breederId) {
        coinService.spend(breederId, props.getCoins().getProfileBoostCost(),
                CoinReason.PROFILE_BOOST, "boost:" + breederId + ":" + LocalDate.now());
        var user = userRepository.findById(breederId).orElseThrow(() -> ApiException.notFound("Użytkownik nie istnieje."));
        user.setBoostedUntil(Instant.now().plusSeconds(24 * 3600));
        userRepository.save(user);
        log.info("Boost profilu hodowcy {} na 24 h.", breederId);
        return coinService.balance(breederId);
    }

    @Transactional
    public void markSold(Long breederId, Long listingId) {
        Listing listing = ownedListing(breederId, listingId);
        listing.setStatus(ListingStatus.SOLD);
        listing.setUpdatedAt(Instant.now());
        listingRepository.save(listing);
    }

    @Transactional
    public void delete(Long breederId, Long listingId) {
        Listing listing = ownedListing(breederId, listingId);
        mediaRepository.deleteByListingId(listingId);
        listingRepository.delete(listing);
    }

    @Transactional(readOnly = true)
    public ListingDto get(Long id) {
        Listing listing = listingRepository.findById(id).orElseThrow(() -> ApiException.notFound("Ogłoszenie nie istnieje."));
        return ListingDto.from(listing, mediaOf(id), null);
    }

    /**
     * 0.4.0: sort — NEWEST (domyślnie), PRICE_ASC, PRICE_DESC, DISTANCE.
     * Wyróżnione ogłoszenia zawsze na początku.
     */
    @Transactional(readOnly = true)
    public List<ListingDto> nearby(double lat, double lng, double radiusKm, String species, String breed, String city,
                                   String listingType, BigDecimal minPrice, BigDecimal maxPrice, String sort,
                                   int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 50));
        List<ListingDto> dtos = listingRepository.searchNearby(lat, lng, radiusKm,
                        species == null || species.isBlank() ? null : species.toUpperCase(),
                        breed, city,
                        listingType == null || listingType.isBlank() ? null : listingType.toUpperCase(),
                        minPrice, maxPrice, pageable)
                .stream()
                .map(row -> {
                    Listing l = listingRepository.findById(row.getId()).orElse(null);
                    if (l == null) return null;
                    return ListingDto.from(l, mediaOf(l.getId()), row.getDistanceKm());
                })
                .filter(java.util.Objects::nonNull)
                .toList();

        Comparator<ListingDto> featured = Comparator.comparing(
                (ListingDto d) -> d.featuredUntil() != null && d.featuredUntil().isAfter(Instant.now()) ? 0 : 1);
        String mode = sort == null ? "NEWEST" : sort.trim().toUpperCase();
        Comparator<ListingDto> rest = switch (mode) {
            case "PRICE_ASC" -> Comparator.comparing(ListingDto::price,
                    Comparator.nullsLast(Comparator.naturalOrder()));
            case "PRICE_DESC" -> Comparator.comparing(ListingDto::price,
                    Comparator.nullsLast(Comparator.reverseOrder()));
            case "NEWEST" -> Comparator.comparing(ListingDto::createdAt,
                    Comparator.nullsLast(Comparator.reverseOrder()));
            default -> Comparator.comparing(d -> d.distanceKm() == null ? Double.MAX_VALUE : d.distanceKm().doubleValue());
        };
        return dtos.stream().sorted(featured.thenComparing(rest)).toList();
    }

    /** 0.4.0: podpowiedzi wyszukiwarki (rasy + miasta) w czasie rzeczywistym. */
    @Transactional(readOnly = true)
    public Map<String, List<String>> suggest(String q) {
        String term = q == null ? "" : q.trim();
        if (term.length() < 2) {
            return Map.of("breeds", List.of(), "cities", List.of());
        }
        return Map.of(
                "breeds", listingRepository.suggestBreeds(term),
                "cities", listingRepository.suggestCities(term));
    }

    /** HoloFeed (faza 3): pionowy feed wideo z ogłoszeń. */
    @Transactional(readOnly = true)
    public List<ListingDto> feed(int limit) {
        return listingRepository.findFeed(Math.min(limit, 50)).stream()
                .map(l -> ListingDto.from(l, mediaOf(l.getId()), null))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ListingDto> mine(Long breederId) {
        return listingRepository.findByBreederIdOrderByCreatedAtDesc(breederId, Pageable.ofSize(100))
                .map(l -> ListingDto.from(l, mediaOf(l.getId()), null))
                .getContent();
    }

    private Listing ownedListing(Long breederId, Long listingId) {
        Listing listing = listingRepository.findById(listingId).orElseThrow(() -> ApiException.notFound("Ogłoszenie nie istnieje."));
        if (!listing.getBreederId().equals(breederId)) {
            throw ApiException.forbidden("NOT_OWNER", "To ogłoszenie nie należy do Ciebie.");
        }
        return listing;
    }

    private void requireVerifiedBreeder(Long userId) {
        var user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Użytkownik nie istnieje."));
        if (user.getRole() != com.purre.pets.user.Role.BREEDER) {
            throw ApiException.forbidden("NOT_BREEDER", "Ogłoszenia może wystawiać tylko HODOWCA.");
        }
        boolean approved = verificationRepository.findByUserId(userId)
                .map(v -> v.getStatus() == VerificationStatus.APPROVED)
                .orElse(false);
        if (!approved) {
            throw ApiException.forbidden("NOT_VERIFIED",
                    "Wystawianie ogłoszeń wymaga statusu „Zweryfikowany hodowca”. Przejdź weryfikację dokumentów.");
        }
    }

    private List<ListingMedia> mediaOf(Long listingId) {
        return mediaRepository.findByListingIdOrderByPositionAsc(listingId);
    }
}
