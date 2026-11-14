package com.purre.pets.breeder;

import com.purre.pets.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/breeders")
@RequiredArgsConstructor
public class BreederController {

    private final BreederService breederService;

    /** Publiczny profil hodowcy — działa też bez zalogowania (currentUserId opcjonalny). */
    @GetMapping("/{id}")
    public BreederProfileDto profile(@PathVariable Long id,
                                     @AuthenticationPrincipal UserPrincipal user) {
        return breederService.profile(id, user != null ? user.id() : null);
    }

    @PostMapping("/{id}/follow")
    public BreederProfileDto follow(@AuthenticationPrincipal UserPrincipal user, @PathVariable Long id) {
        return breederService.follow(user.id(), id);
    }

    @DeleteMapping("/{id}/follow")
    public BreederProfileDto unfollow(@AuthenticationPrincipal UserPrincipal user, @PathVariable Long id) {
        return breederService.unfollow(user.id(), id);
    }
}
