package com.purre.pets.match;

import com.purre.pets.match.MatchService.MatchResult;
import com.purre.pets.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/match")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;

    @GetMapping
    public List<MatchResult> match(@AuthenticationPrincipal UserPrincipal principal) {
        return matchService.match(principal.id());
    }

    @GetMapping("/preferences")
    public MatchPreference preferences(@AuthenticationPrincipal UserPrincipal principal) {
        return matchService.get(principal.id());
    }

    @PutMapping("/preferences")
    public MatchPreference save(@AuthenticationPrincipal UserPrincipal principal,
                                @RequestBody MatchPreference req) {
        return matchService.save(principal.id(), req);
    }
}