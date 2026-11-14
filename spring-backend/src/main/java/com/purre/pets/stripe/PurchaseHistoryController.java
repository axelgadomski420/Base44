package com.purre.pets.stripe;

import com.purre.pets.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/purchases")
@RequiredArgsConstructor
public class PurchaseHistoryController {

    private final StripePurchaseRepository purchaseRepository;

    /** Historia zakupów PURRE Coins w profilu użytkownika. */
    @GetMapping("/me")
    public List<PurchaseDto> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return purchaseRepository.findByUserIdOrderByCreatedAtDesc(principal.id()).stream()
                .map(p -> new PurchaseDto(p.getId(), p.getPackId(), p.getCoins(), p.getAmountGrosze() / 100.0,
                        p.getStatus().name(), p.getCreatedAt(), p.getCompletedAt()))
                .toList();
    }

    public record PurchaseDto(Long id, String packId, int coins, double pricePln, String status,
                              java.time.Instant createdAt, java.time.Instant completedAt) {}
}