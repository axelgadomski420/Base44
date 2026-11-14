package com.purre.pets.coins;

public enum CoinReason {
    COIN_PURCHASE,     // zakup przez Stripe
    WELCOME_BONUS,
    DAILY_BONUS,       // bonus dzienny Arcade
    ARCADE_REWARD,     // nagroda za mini-grę
    LISTING_PUBLISH,   // koszt wystawienia ogłoszenia (50)
    LISTING_FEATURE,   // wyróżnienie ogłoszenia (100 / 7 dni)
    PROFILE_BOOST,     // boost profilu (200 / 24 h)
    SPONSORED_AD,      // sponsorowane ogłoszenie reklamowe
    ADMIN_GRANT
}