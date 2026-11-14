package com.purre.pets.ads;

import com.purre.pets.common.ApiException;
import com.purre.pets.coins.CoinReason;
import com.purre.pets.coins.CoinService;
import com.purre.pets.user.User;
import com.purre.pets.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

/**
 * System reklam: sponsorowane ogłoszenia hodowców (PURRE Coins), partnerzy, sloty AdSense.
 * Zasady: nie zasłaniają treści, oznaczone „Sponsorowane", rotacja 1 na 5–7 interakcji (capping po stronie UI),
 * wyłączone dla PURRE Premium. Zgodność RODO: bez profilowania, impression anonimowy opcjonalnie.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdService {

    public static final int SPONSORED_1D_COINS = 50;
    public static final int SPONSORED_7D_COINS = 200;

    private final AdCampaignRepository campaignRepository;
    private final AdImpressionRepository impressionRepository;
    private final CoinService coinService;
    private final UserRepository userRepository;
    private final AtomicLong rotation = new AtomicLong(0);

    @Transactional
    public AdCampaign createSponsored(Long advertiserId, String title, String imageUrl, String targetUrl, int days) {
        if (days != 1 && days != 7) {
            throw ApiException.badRequest("BAD_DURATION", "Sponsorowana reklama: 1 dzień (50 coins) lub 7 dni (200 coins).");
        }
        int cost = days == 1 ? SPONSORED_1D_COINS : SPONSORED_7D_COINS;
        Instant now = Instant.now();
        coinService.spend(advertiserId, cost, CoinReason.SPONSORED_AD, "ad:" + advertiserId + ":" + now.toEpochMilli());
        AdCampaign campaign = campaignRepository.save(AdCampaign.builder()
                .advertiserId(advertiserId)
                .title(title)
                .imageUrl(imageUrl)
                .targetUrl(targetUrl)
                .type(AdCampaign.AdType.SPONSORED_LISTING)
                .priceCoins(cost)
                .active(true)
                .activeFrom(now)
                .activeUntil(now.plusSeconds(days * 24L * 3600))
                .createdAt(now)
                .build());
        log.info("Kampania sponsorowana id={} hodowcy={} na {} dni.", campaign.getId(), advertiserId, days);
        return campaign;
    }

    @Transactional
    public AdCampaign createManaged(Long adminId, String title, String imageUrl, String targetUrl, AdCampaign.AdType type, int days) {
        Instant now = Instant.now();
        return campaignRepository.save(AdCampaign.builder()
                .advertiserId(adminId)
                .title(title)
                .imageUrl(imageUrl)
                .targetUrl(targetUrl)
                .type(type)
                .active(true)
                .activeFrom(now)
                .activeUntil(now.plusSeconds(days * 24L * 3600))
                .createdAt(now)
                .build());
    }

    @Transactional
    public AdDto serve(String placement, Long userId) {
        // PURRE Premium — bez reklam
        if (userId != null) {
            boolean premium = userRepository.findById(userId)
                    .map(u -> u.getPremiumUntil() != null && u.getPremiumUntil().isAfter(Instant.now()))
                    .orElse(false);
            if (premium) return null;
        }
        List<AdCampaign> active = campaignRepository
                .findByActiveTrueAndActiveFromBeforeAndActiveUntilAfter(Instant.now(), Instant.now());
        if (active.isEmpty()) return null;
        AdCampaign campaign = active.get((int) Math.floorMod(rotation.incrementAndGet(), active.size()));
        campaign.setImpressions(campaign.getImpressions() + 1);
        campaignRepository.save(campaign);
        impressionRepository.save(AdImpression.builder()
                .campaignId(campaign.getId()).userId(userId).placement(placement).createdAt(Instant.now()).build());
        return AdDto.from(campaign);
    }

    @Transactional(readOnly = true)
    public List<AdCampaign> mine(Long advertiserId) {
        return campaignRepository.findByAdvertiserIdOrderByCreatedAtDesc(advertiserId);
    }

    @Transactional(readOnly = true)
    public List<AdCampaign> listAll() {
        return campaignRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @Transactional
    public AdCampaign setActive(Long campaignId, boolean active) {
        AdCampaign c = campaignRepository.findById(campaignId)
                .orElseThrow(() -> ApiException.notFound("Kampania nie istnieje."));
        c.setActive(active);
        return campaignRepository.save(c);
    }

    public record AdDto(Long id, String title, String imageUrl, String targetUrl, String type) {
        public static AdDto from(AdCampaign c) {
            return new AdDto(c.getId(), c.getTitle(), c.getImageUrl(), c.getTargetUrl(), c.getType().name());
        }
    }
}