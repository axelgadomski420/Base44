package com.purre.pets.coins;

import com.purre.pets.coins.dto.*;
import com.purre.pets.common.ApiException;
import com.purre.pets.common.RateLimiter;
import com.purre.pets.security.UserPrincipal;
import com.purre.pets.stripe.StripeCheckoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/coins")
@RequiredArgsConstructor
public class CoinsController {

    private final CoinService coinService;
    private final CoinTransactionRepository txRepository;
    private final StripeCheckoutService stripeService;
    private final RateLimiter rateLimiter;

    @GetMapping("/wallet")
    public WalletDto wallet(@AuthenticationPrincipal UserPrincipal principal) {
        int balance = coinService.balance(principal.id());
        var packs = CoinPack.ALL.stream()
                .map(p -> new WalletDto.CoinPackDto(p.id(), p.coins(), p.priceGrosze() / 100.0))
                .toList();
        return new WalletDto(balance, packs);
    }

    @GetMapping("/transactions")
    public Page<TransactionDto> transactions(@AuthenticationPrincipal UserPrincipal principal,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return txRepository.findByUserIdOrderByCreatedAtDesc(principal.id(), PageRequest.of(page, Math.min(size, 100)))
                .map(TransactionDto::from);
    }

    @PostMapping("/purchase")
    public PurchaseResponse purchase(@AuthenticationPrincipal UserPrincipal principal,
                                     @RequestBody PurchaseRequest req) {
        if (!rateLimiter.allow("purchase:" + principal.id(), 5, 60_000)) {
            throw ApiException.tooMany("Zbyt wiele prób zakupu. Odczekaj chwilę.");
        }
        return stripeService.createCheckoutSession(principal.id(), req.packId());
    }

    public record PurchaseRequest(String packId) {}
}