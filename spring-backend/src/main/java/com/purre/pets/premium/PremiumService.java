package com.purre.pets.premium;

import com.purre.pets.coins.CoinReason;
import com.purre.pets.coins.CoinService;
import com.purre.pets.common.ApiException;
import com.purre.pets.user.User;
import com.purre.pets.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

/**
 * PURRE Premium (faza 4): 500 coins / 30 dni. Premium pomija reklamy w AdService.serve
 * i dostaje badge w profilu. Kolejne zakupy przedłużają okres od bieżącego wygaśnięcia.
 */
@Service
@RequiredArgsConstructor
public class PremiumService {

    public static final int PRICE_COINS = 500;
    public static final long PERIOD_SECONDS = Duration.ofDays(30).toSeconds();

    private final CoinService coinService;
    private final UserRepository userRepository;

    @Transactional
    public PremiumStatus purchase(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Nie znaleziono użytkownika."));
        Instant now = Instant.now();
        coinService.spend(userId, PRICE_COINS, CoinReason.PREMIUM_SUBSCRIPTION,
                "premium:" + userId + ":" + now.toEpochMilli());
        Instant base = user.getPremiumUntil() != null && user.getPremiumUntil().isAfter(now)
                ? user.getPremiumUntil() : now;
        user.setPremiumUntil(base.plusSeconds(PERIOD_SECONDS));
        userRepository.save(user);
        return toStatus(user, coinService.balance(userId));
    }

    @Transactional(readOnly = true)
    public PremiumStatus statusOf(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Nie znaleziono użytkownika."));
        return toStatus(user, coinService.balance(userId));
    }

    private PremiumStatus toStatus(User user, int balance) {
        Instant until = user.getPremiumUntil();
        boolean active = until != null && until.isAfter(Instant.now());
        return new PremiumStatus(active, until, balance, PRICE_COINS);
    }

    public record PremiumStatus(boolean active, Instant premiumUntil, int balance, int priceCoins) {}
}