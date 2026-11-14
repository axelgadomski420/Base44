package com.purre.pets.membership;

import com.purre.pets.common.ApiException;
import com.purre.pets.config.AppProperties;
import com.purre.pets.coins.CoinReason;
import com.purre.pets.coins.CoinService;
import com.purre.pets.user.User;
import com.purre.pets.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Pakiety członkowskie (0.4.0): FREE / PRO (300 🪙) / ULTIMATE (800 🪙) — 30 dni.
 * PURRE Premium (500 🪙) pozostaje osobnym produktem (bez reklam).
 * Reels wymagają PRO/ULTIMATE/PREMIUM.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MembershipService {

    private final UserRepository userRepository;
    private final CoinService coinService;
    private final AppProperties props;

    public record MembershipStatus(String plan, Instant planUntil, boolean active,
                                   boolean premiumActive, boolean canReel,
                                   int proCoins, int ultimateCoins) {}

    @Transactional(readOnly = true)
    public MembershipStatus status(Long userId) {
        User u = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Użytkownik nie istnieje."));
        boolean active = isActive(u);
        boolean premiumActive = u.getPremiumUntil() != null && u.getPremiumUntil().isAfter(Instant.now());
        return new MembershipStatus(u.getPlan(), u.getPlanUntil(), active, premiumActive,
                active || premiumActive, props.getMembership().getProCoins(), props.getMembership().getUltimateCoins());
    }

    @Transactional
    public MembershipStatus purchase(Long userId, String planName) {
        String plan = planName == null ? "" : planName.trim().toUpperCase();
        int cost;
        if ("PRO".equals(plan)) cost = props.getMembership().getProCoins();
        else if ("ULTIMATE".equals(plan)) cost = props.getMembership().getUltimateCoins();
        else throw ApiException.badRequest("BAD_PLAN", "Pakiet: PRO lub ULTIMATE.");

        User u = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Użytkownik nie istnieje."));
        Instant now = Instant.now();
        // Podbiliśmy pakiet? wyższy zastępuje niższy; ten sam przedłuża.
        if (isActive(u) && rank(u.getPlan()) > rank(plan)) {
            throw ApiException.conflict("PLAN_DOWNGRADE", "Masz aktywny wyższy pakiet (" + u.getPlan() + ").");
        }
        Instant base = isActive(u) && u.getPlan().equals(plan) && u.getPlanUntil() != null ? u.getPlanUntil() : now;
        Instant until = base.plusSeconds(props.getMembership().getDays() * 24L * 3600);
        coinService.spend(userId, cost, CoinReason.MEMBERSHIP, "membership:" + plan + ":" + userId + ":" + now.toEpochMilli());
        u.setPlan(plan);
        u.setPlanUntil(until);
        userRepository.save(u);
        log.info("Pakiet {} aktywowany dla user={} do {}.", plan, userId, until);
        return status(userId);
    }

    @Transactional(readOnly = true)
    public boolean hasReelAccess(Long userId) {
        return userRepository.findById(userId).map(u -> isActive(u)
                || (u.getPremiumUntil() != null && u.getPremiumUntil().isAfter(Instant.now()))).orElse(false);
    }

    private boolean isActive(User u) {
        return u.getPlanUntil() != null && u.getPlanUntil().isAfter(Instant.now())
                && (u.getPlan() != null && (u.getPlan().equals("PRO") || u.getPlan().equals("ULTIMATE")));
    }

    private int rank(String plan) {
        return "ULTIMATE".equals(plan) ? 2 : "PRO".equals(plan) ? 1 : 0;
    }
}
