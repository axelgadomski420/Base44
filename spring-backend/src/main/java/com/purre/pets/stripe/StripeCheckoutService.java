package com.purre.pets.stripe;

import com.purre.pets.common.ApiException;
import com.purre.pets.config.AppProperties;
import com.purre.pets.coins.CoinPack;
import com.purre.pets.coins.CoinReason;
import com.purre.pets.coins.CoinService;
import com.purre.pets.coins.dto.PurchaseResponse;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class StripeCheckoutService {

    private final StripePurchaseRepository purchaseRepository;
    private final CoinService coinService;
    private final EmailService emailService;
    private final AppProperties props;

    @PostConstruct
    void init() {
        if (props.getStripe().getSecretKey() != null && !props.getStripe().getSecretKey().isBlank()) {
            Stripe.apiKey = props.getStripe().getSecretKey();
        }
    }

    @Transactional
    public PurchaseResponse createCheckoutSession(Long userId, String packId) {
        CoinPack pack = CoinPack.byId(packId)
                .orElseThrow(() -> ApiException.badRequest("UNKNOWN_PACK", "Nieznany pakiet coins."));
        if (props.getStripe().getSecretKey() == null || props.getStripe().getSecretKey().isBlank()) {
            throw ApiException.conflict("STRIPE_NOT_CONFIGURED", "Płatności nie są skonfigurowane na tym środowisku.");
        }
        try {
            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setCustomerEmail(null)
                    .setSuccessUrl(props.getFrontendUrl() + "/wallet?stripe=success")
                    .setCancelUrl(props.getFrontendUrl() + "/wallet?stripe=cancel")
                    .putMetadata("userId", String.valueOf(userId))
                    .putMetadata("packId", pack.id())
                    .putMetadata("coins", String.valueOf(pack.coins()))
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setQuantity(1L)
                            .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                    .setCurrency("pln")
                                    .setUnitAmount(pack.priceGrosze())
                                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                            .setName("PURRE Coins — pakiet " + pack.coins())
                                            .build())
                                    .build())
                            .build())
                    .build();
            Session session = Session.create(params);
            purchaseRepository.save(StripePurchase.builder()
                    .sessionId(session.getId())
                    .userId(userId)
                    .packId(pack.id())
                    .coins(pack.coins())
                    .amountGrosze(pack.priceGrosze())
                    .status(StripePurchase.PurchaseStatus.PENDING)
                    .createdAt(Instant.now())
                    .build());
            log.info("Stripe Checkout utworzony: user={}, pack={}, session={}", userId, pack.id(), session.getId());
            return new PurchaseResponse(session.getUrl(), session.getId());
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Błąd Stripe Checkout: {}", e.getMessage(), e);
            throw ApiException.conflict("STRIPE_ERROR", "Nie udało się rozpocząć płatności. Spróbuj ponownie.");
        }
    }

    /**
     * Webhook Stripe — weryfikacja podpisu, idempotentne zasilenie portfela.
     * Zwraca "duplicate" gdy zdarzenie już przetworzono (retry Stripe jest bezpieczny).
     */
    @Transactional
    public String handleWebhook(String payload, String signatureHeader) {
        String secret = props.getStripe().getWebhookSecret();
        if (secret == null || secret.isBlank()) {
            throw ApiException.conflict("WEBHOOK_NOT_CONFIGURED", "Webhook Stripe nie jest skonfigurowany.");
        }
        com.stripe.model.Event event;
        try {
            event = Webhook.constructEvent(payload, signatureHeader, secret);
        } catch (SignatureVerificationException e) {
            log.warn("Odrzucono webhook Stripe — nieprawidłowy podpis.");
            throw ApiException.badRequest("BAD_SIGNATURE", "Nieprawidłowy podpis webhooka.");
        }
        log.info("Stripe webhook: type={}", event.getType());
        if ("checkout.session.completed".equals(event.getType())) {
            Optional<Session> sessionOpt = event.getDataObjectDeserializer().getObject()
                    .filter(o -> o instanceof Session)
                    .map(o -> (Session) o);
            if (sessionOpt.isEmpty()) return "ignored";
            Session session = sessionOpt.get();
            StripePurchase purchase = purchaseRepository.findBySessionId(session.getId()).orElse(null);
            if (purchase == null) {
                log.warn("Webhook dla nieznanej sesji {} — pomijam.", session.getId());
                return "unknown-session";
            }
            if (purchase.getStatus() == StripePurchase.PurchaseStatus.COMPLETED) {
                return "duplicate";
            }
            int coins = purchase.getCoins();
            coinService.earn(purchase.getUserId(), coins, CoinReason.COIN_PURCHASE, purchase.getSessionId());
            purchase.setStatus(StripePurchase.PurchaseStatus.COMPLETED);
            purchase.setCompletedAt(Instant.now());
            purchaseRepository.save(purchase);
            emailService.sendCoinsPurchased(purchase.getUserId(), coins, purchase.getAmountGrosze());
            log.info("Zasilon portfel user={} o {} coins (session={}).", purchase.getUserId(), coins, purchase.getSessionId());
            return "completed";
        }
        return "ignored";
    }
}