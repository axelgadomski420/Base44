package com.purre.pets.stripe;

import com.purre.pets.common.ApiException;
import com.purre.pets.common.RateLimiter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/stripe")
@RequiredArgsConstructor
public class StripeWebhookController {

    private final StripeCheckoutService checkoutService;
    private final RateLimiter rateLimiter;

    @PostMapping(value = "/webhook", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> webhook(
            @RequestHeader(value = "Stripe-Signature", required = false) String signature,
            @RequestBody String payload) {
        if (signature == null || signature.isBlank()) {
            throw ApiException.badRequest("MISSING_SIGNATURE", "Brak nagłówka Stripe-Signature.");
        }
        if (!rateLimiter.allow("stripe-webhook", 120, 60_000)) {
            throw ApiException.tooMany("Rate limit webhooka.");
        }
        String result = checkoutService.handleWebhook(payload, signature);
        return ResponseEntity.ok(Map.of("status", result));
    }
}