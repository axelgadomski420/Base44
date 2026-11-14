package com.purre.pets.premium;

import com.purre.pets.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/premium")
@RequiredArgsConstructor
public class PremiumController {

    private final PremiumService premiumService;

    @PostMapping("/purchase")
    public PremiumService.PremiumStatus purchase(@AuthenticationPrincipal UserPrincipal principal) {
        return premiumService.purchase(principal.id());
    }

    @GetMapping("/status")
    public PremiumService.PremiumStatus status(@AuthenticationPrincipal UserPrincipal principal) {
        return premiumService.statusOf(principal.id());
    }
}