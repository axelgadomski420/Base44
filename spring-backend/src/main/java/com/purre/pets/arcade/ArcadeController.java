package com.purre.pets.arcade;

import com.purre.pets.common.ApiException;
import com.purre.pets.common.RateLimiter;
import com.purre.pets.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/arcade")
@RequiredArgsConstructor
public class ArcadeController {

    private final ArcadeService arcadeService;
    private final RateLimiter rateLimiter;

    public record SubmitScoreRequest(String game, int score, int durationSeconds) {}

    @PostMapping("/scores")
    public ArcadeService.ScoreResult submit(@AuthenticationPrincipal UserPrincipal principal,
                                            @RequestBody SubmitScoreRequest req) {
        if (!rateLimiter.allow("arcade:" + principal.id(), 60, 60_000)) {
            throw ApiException.tooMany("Zbyt wiele zgłoszeń wyników.");
        }
        return arcadeService.submitScore(principal.id(), req.game(), req.score(), req.durationSeconds());
    }

    @PostMapping("/daily")
    public ArcadeService.DailyResult claimDaily(@AuthenticationPrincipal UserPrincipal principal) {
        if (!rateLimiter.allow("arcade-daily:" + principal.id(), 10, 60_000)) {
            throw ApiException.tooMany("Zbyt wiele prób.");
        }
        return arcadeService.claimDaily(principal.id());
    }

    @GetMapping("/leaderboard")
    public List<ArcadeService.LeaderboardEntry> leaderboard() {
        return arcadeService.weeklyLeaderboard();
    }

    @GetMapping("/xp")
    public Map<String, Integer> xp(@AuthenticationPrincipal UserPrincipal principal) {
        return Map.of("xp", arcadeService.coinXp(principal.id()));
    }
}