package com.purre.pets.coins;

import java.util.List;
import java.util.Optional;

/** Pakiety PURRE Coins (ceny w groszach, PLN). */
public record CoinPack(String id, int coins, long priceGrosze) {
    public static final List<CoinPack> ALL = List.of(
            new CoinPack("coins_100", 100, 999),
            new CoinPack("coins_500", 500, 3999),
            new CoinPack("coins_1000", 1000, 6999),
            new CoinPack("coins_5000", 5000, 29999)
    );

    public static Optional<CoinPack> byId(String id) {
        return ALL.stream().filter(p -> p.id().equals(id)).findFirst();
    }
}