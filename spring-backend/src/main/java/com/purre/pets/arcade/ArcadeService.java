package com.purre.pets.arcade;

import com.purre.pets.common.ApiException;
import com.purre.pets.config.AppProperties;
import com.purre.pets.coins.CoinReason;
import com.purre.pets.coins.CoinService;
import com.purre.pets.coins.CoinTransactionRepository;
import com.purre.pets.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Ekonomia Arcade: anti-cheat po stronie backendu (limity wyniku, minimalny czas gry,
 * dzienny limit coins), dzienny bonus + streak, ranking tygodniowy, XP.
 * Brak hazardu i wypłat na prawdziwe pieniądze — coins to waluta wyłącznie wewnętrzna.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArcadeService {

    private final ArcadeScoreRepository scoreRepository;
    private final DailyRewardRepository dailyRewardRepository;
    private final CoinTransactionRepository txRepository;
    private final CoinService coinService;
    private final UserRepository userRepository;
    private final AppProperties props;

    @Transactional
    public ScoreResult submitScore(Long userId, String gameId, int score, int durationSeconds) {
        GameRule rule = GameRule.byId(gameId)
                .orElseThrow(() -> ApiException.badRequest("UNKNOWN_GAME", "Nieznana gra: " + gameId));
        if (score < 0) throw ApiException.badRequest("BAD_SCORE", "Wynik nie może być ujemny.");
        if (score > rule.maxScore()) {
            log.warn("ANTI-CHEAT: user={} gra={} score={} > limit {} — odrzucam.", userId, rule.id(), score, rule.maxScore());
            throw ApiException.badRequest("SCORE_OUT_OF_RANGE", "Wynik przekracza limit dla tej gry.");
        }
        if (durationSeconds < rule.minDurationSeconds() || durationSeconds > 3600) {
            log.warn("ANTI-CHEAT: user={} gra={} czas={}s poza zakresem.", userId, rule.id(), durationSeconds);
            throw ApiException.badRequest("DURATION_OUT_OF_RANGE", "Czas gry jest nierealny.");
        }

        int coins = rule.quizLike() ? Math.min(50, score * 5) : Math.clamp(score / 100, 10, 50);
        int cap = props.getArcade().getDailyGameCoinsCap();
        int earnedToday = txRepository.sumArcadeCoinsSince(userId, LocalDate.now().atStartOfDay(ZoneOffset.UTC).toInstant());
        int cappedCoins = Math.max(0, Math.min(coins, cap - earnedToday));

        int xp = Math.max(1, score / 10);
        ArcadeScore saved = scoreRepository.save(ArcadeScore.builder()
                .userId(userId).game(rule.id()).score(score).durationSeconds(durationSeconds)
                .coinsAwarded(cappedCoins).xpAwarded(xp).createdAt(Instant.now()).build());

        int balance = coinService.balance(userId);
        if (cappedCoins > 0) {
            balance = coinService.earn(userId, cappedCoins, CoinReason.ARCADE_REWARD, "score:" + saved.getId());
        } else if (coins > 0) {
            log.info("Dzienny limit coins Arcade wyczerpany dla user={} — wynik zapisany bez nagrody.", userId);
        }
        return new ScoreResult(saved.getId(), cappedCoins, xp, balance, coinXp(userId), cappedCoins == 0 && coins > 0);
    }

    @Transactional
    public DailyResult claimDaily(Long userId) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        if (dailyRewardRepository.findByUserIdAndRewardDate(userId, today).isPresent()) {
            throw ApiException.conflict("ALREADY_CLAIMED", "Bonus dzienny odebrano już dzisiaj.");
        }
        int streak = dailyRewardRepository.findByUserIdAndRewardDate(userId, today.minusDays(1))
                .map(DailyReward::getStreak).orElse(0) + 1;
        int coins = props.getArcade().getDailyBonusCoins()
                + Math.min(8, streak - 1) * props.getArcade().getStreakBonusCoins();
        dailyRewardRepository.save(DailyReward.builder()
                .userId(userId).rewardDate(today).streak(streak).coins(coins).claimedAt(Instant.now()).build());
        int balance = coinService.earn(userId, coins, CoinReason.DAILY_BONUS, "daily:" + userId + ":" + today);
        return new DailyResult(coins, streak, balance);
    }

    @Transactional(readOnly = true)
    public List<LeaderboardEntry> weeklyLeaderboard() {
        Instant monday = LocalDate.now(ZoneOffset.UTC)
                .with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .atStartOfDay(ZoneOffset.UTC).toInstant();
        List<Object[]> rows = scoreRepository.weeklyTotalsSince(monday);
        List<LeaderboardEntry> entries = new ArrayList<>();
        int rank = 1;
        for (Object[] row : rows) {
            if (rank > 10) break;
            Long userId = (Long) row[0];
            Long total = (Long) row[1];
            String name = userRepository.findById(userId)
                    .map(u -> u.getDisplayName()).orElse("Użytkownik");
            boolean bonus = rank <= 10;
            entries.add(new LeaderboardEntry(rank++, userId, name, total, bonus));
        }
        return entries;
    }

    @Transactional(readOnly = true)
    public int coinXp(Long userId) {
        return scoreRepository.totalXp(userId);
    }

    public record ScoreResult(Long scoreId, int coinsAwarded, int xpAwarded, int balance, int totalXp, boolean dailyCapReached) {}
    public record DailyResult(int coins, int streak, int balance) {}
    public record LeaderboardEntry(int rank, Long userId, String displayName, Long totalScore, boolean weeklyBonus) {}
}