package com.purre.pets.breeder;

import com.purre.pets.common.ApiException;
import com.purre.pets.follow.Follow;
import com.purre.pets.follow.FollowId;
import com.purre.pets.follow.FollowRepository;
import com.purre.pets.listing.Listing;
import com.purre.pets.listing.ListingRepository;
import com.purre.pets.listing.ListingStatus;
import com.purre.pets.membership.MembershipService;
import com.purre.pets.post.PostRepository;
import com.purre.pets.user.User;
import com.purre.pets.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BreederService {

    private final UserRepository userRepository;
    private final FollowRepository followRepository;
    private final ListingRepository listingRepository;
    private final PostRepository postRepository;
    private final MembershipService membershipService;

    @Transactional(readOnly = true)
    public BreederProfileDto profile(Long breederId, Long currentUserId) {
        User u = userRepository.findById(breederId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono hodowcy"));

        List<Listing> active = listingRepository.findByBreederIdOrderByCreatedAtDesc(breederId).stream()
                .filter(l -> l.getStatus() == ListingStatus.ACTIVE)
                .limit(12)
                .toList();

        long followers = followRepository.countByIdBreederId(breederId);
        boolean followedByMe = currentUserId != null
                && followRepository.existsById(new FollowId(currentUserId, breederId));

        return new BreederProfileDto(
                u.getId(),
                u.getDisplayName(),
                u.getBio(),
                u.getCity(),
                u.getRegion(),
                u.getAvatarUrl(),
                u.getWebsite(),
                u.getInstagram(),
                u.isVerifiedBadge(),
                followers,
                followedByMe,
                active.size(),
                trustScore(u, active.size(), followers),
                active.stream().map(BreederService::toSummary).toList()
        );
    }

    @Transactional
    public BreederProfileDto follow(Long currentUserId, Long breederId) {
        if (currentUserId.equals(breederId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nie możesz obserwować samego siebie");
        }
        FollowId id = new FollowId(currentUserId, breederId);
        if (!followRepository.existsById(id)) {
            followRepository.save(new Follow(currentUserId, breederId));
        }
        return profile(breederId, currentUserId);
    }

    @Transactional
    public BreederProfileDto unfollow(Long currentUserId, Long breederId) {
        followRepository.deleteById(new FollowId(currentUserId, breederId));
        return profile(breederId, currentUserId);
    }

    /**
     * 0.5.0: statystyki hodowcy — pakiet PRO/ULTIMATE/PREMIUM (paywall dla FREE).
     * Ogłoszenia wg statusu, polubienia postów, obserwujący.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> stats(Long breederId) {
        if (!membershipService.hasStatsAccess(breederId)) {
            throw ApiException.forbidden("PAYWALL_REQUIRED",
                    "Statystyki są dostępne w pakietach PRO, ULTIMATE i PREMIUM.");
        }
        long active = listingRepository.countByBreederIdAndStatus(breederId, ListingStatus.ACTIVE);
        long sold = listingRepository.countByBreederIdAndStatus(breederId, ListingStatus.SOLD);
        long likes = postRepository.sumLikesByUserId(breederId);
        long followers = followRepository.countByIdBreederId(breederId);
        return Map.of(
                "activeListings", active,
                "soldListings", sold,
                "postLikes", likes,
                "followers", followers
        );
    }

    /**
     * Trust Score (0-100): weryfikacja hodowcy (40) + aktywne ogłoszenia (do 30)
     * + obserwujący (do 20) + konto premium (10).
     */
    private int trustScore(User u, int activeListings, long followers) {
        int score = 0;
        if (u.isVerifiedBadge()) score += 40;
        score += Math.min(30, activeListings * 3);
        score += Math.min(20, (int) followers);
        if (u.getPremiumUntil() != null && u.getPremiumUntil().isAfter(java.time.Instant.now())) score += 10;
        return Math.min(100, score);
    }

    private static ListingSummaryDto toSummary(Listing l) {
        return new ListingSummaryDto(l.getId(), l.getTitle(), l.getSpecies() != null ? l.getSpecies().name() : null,
                l.getBreed(), l.getCity(),
                l.getListingType() != null ? l.getListingType().name() : null,
                l.getStatus().name(), l.getPrice(), l.getCurrency());
    }
}
