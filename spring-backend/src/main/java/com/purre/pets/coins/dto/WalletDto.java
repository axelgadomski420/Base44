package com.purre.pets.coins.dto;

public record WalletDto(int balance, java.util.List<CoinPackDto> packs) {
    public record CoinPackDto(String id, int coins, double pricePln) {}
}