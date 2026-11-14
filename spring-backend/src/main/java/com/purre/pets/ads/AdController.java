package com.purre.pets.ads;

import com.purre.pets.ads.AdService.AdDto;
import com.purre.pets.security.UserPrincipal;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/ads")
@RequiredArgsConstructor
public class AdController {

    private final AdService adService;

    /** Publiczny endpoint rotacji reklam (placement: GAME_INTERSTITIAL | HOLOFEED | DISCOVER | BREEDER_PANEL | FOOTER). */
    @GetMapping("/serve")
    public AdDto serve(@RequestParam String placement,
                       @AuthenticationPrincipal(required = false) UserPrincipal principal) {
        return adService.serve(placement, principal == null ? null : principal.id());
    }

    public record CreateSponsoredRequest(
            @NotBlank @Size(max = 160) String title,
            @Size(max = 500) String imageUrl,
            @NotBlank @Size(max = 500) String targetUrl,
            int days) {}

    @PostMapping("/sponsored")
    @PreAuthorize("hasRole('BREEDER')")
    public AdDto createSponsored(@AuthenticationPrincipal UserPrincipal principal,
                                 @RequestBody CreateSponsoredRequest req) {
        return AdDto.from(adService.createSponsored(principal.id(), req.title(), req.imageUrl(), req.targetUrl(), req.days()));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('BREEDER')")
    public List<Object> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return adService.mine(principal.id()).stream()
                .map(c -> new AdDto(c.getId(), c.getTitle(), c.getImageUrl(), c.getTargetUrl(), c.getType().name()))
                .map(o -> (Object) o)
                .toList();
    }

    public record CreateManagedRequest(
            @NotBlank String title, String imageUrl, @NotBlank String targetUrl,
            String type, int days) {}

    @PostMapping("/managed")
    @PreAuthorize("hasRole('ADMIN')")
    public AdDto createManaged(@AuthenticationPrincipal UserPrincipal admin, @RequestBody CreateManagedRequest req) {
        AdCampaign.AdType type = AdCampaign.AdType.valueOf(req.type().toUpperCase());
        return AdDto.from(adService.createManaged(admin.id(), req.title(), req.imageUrl(), req.targetUrl(), type, req.days()));
    }
}