package com.purre.pets.coins.dto;

import com.purre.pets.coins.CoinReason;
import com.purre.pets.coins.CoinTransaction;
import com.purre.pets.coins.TxType;

import java.time.Instant;

public record TransactionDto(Long id, TxType type, int amount, CoinReason reason, String referenceId, int balanceAfter, Instant createdAt) {
    public static TransactionDto from(CoinTransaction t) {
        return new TransactionDto(t.getId(), t.getType(), t.getAmount(), t.getReason(), t.getReferenceId(), t.getBalanceAfter(), t.getCreatedAt());
    }
}