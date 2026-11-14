package com.purre.pets.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter @Setter
@ConfigurationProperties(prefix = "purre")
public class AppProperties {
    private final Jwt jwt = new Jwt();
    private final Cors cors = new Cors();
    private final Upload upload = new Upload();
    private final Crypto crypto = new Crypto();
    private final Ai ai = new Ai();
    private final Stripe stripe = new Stripe();
    private final Coins coins = new Coins();
    private final Arcade arcade = new Arcade();
    private final Membership membership = new Membership();
    private String frontendUrl = "http://localhost:4200";

    @Getter @Setter public static class Jwt { private String secret; private long expirationMinutes = 10080; }
    @Getter @Setter public static class Cors { private String allowedOrigins = "http://localhost:4200"; }
    @Getter @Setter public static class Upload { private String dir = "uploads"; }
    @Getter @Setter public static class Crypto { private String documentsKey; }
    @Getter @Setter public static class Ai {
        private String baseUrl = "http://localhost:8100";
        private int timeoutSeconds = 20;
        /** Auto-akceptacja weryfikacji hodowli przez LLM: riskScore <= próg i AI dostępne. -1 = wyłączone. */
        private int autoApproveRiskScore = 25;
    }
    @Getter @Setter public static class Stripe { private String secretKey; private String webhookSecret; }
    @Getter @Setter public static class Coins { private int listingPublishCost = 50; private int listingFeatureCost = 100; private int profileBoostCost = 200; }
    @Getter @Setter public static class Arcade { private int dailyBonusCoins = 20; private int streakBonusCoins = 10; private int dailyGameCoinsCap = 300; }
    @Getter @Setter public static class Membership { private int proCoins = 300; private int ultimateCoins = 800; private int days = 30; }
}
