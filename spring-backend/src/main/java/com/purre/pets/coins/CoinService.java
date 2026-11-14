package com.purre.pets.coins;

import com.purre.pets.common.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

/**
 * Ekonomia PURRE Coins wg wzorców BlastScale: ledger append-only, blokada wiersza portfela,
 * exactly-once przez unikalny klucz księgi, saldo nigdy nieujemne.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CoinService {

    private final WalletRepository walletRepository;
    private final CoinTransactionRepository txRepository;

    @Transactional(readOnly = true)
    public int balance(Long userId) {
        return walletRepository.findByUserId(userId).map(Wallet::getBalance).orElse(0);
    }

    @Transactional(readOnly = true)
    public Wallet requireWallet(Long userId) {
        return walletRepository.findByUserId(userId)
                .orElseThrow(() -> ApiException.notFound("Brak portfela dla użytkownika."));
    }

    /** Zasilenie portfela. Idempotentne: (user, reason, reference, CREDIT) istnieje → brak podwójnego zasilenia. */
    @Transactional
    public int earn(Long userId, int amount, CoinReason reason, String referenceId) {
        if (amount <= 0) throw ApiException.badRequest("BAD_AMOUNT", "Kwota musi być dodatnia.");
        if (txRepository.existsByUserIdAndReasonAndReferenceIdAndType(userId, reason, referenceId, TxType.CREDIT)) {
            log.info("Idempotencja: kredyt {} {} {} już zaksięgowany — pomijam.", userId, reason, referenceId);
            return balance(userId);
        }
        Wallet wallet = walletRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> ApiException.notFound("Brak portfela."));
        int newBalance = wallet.getBalance() + amount;
        wallet.setBalance(newBalance);
        walletRepository.save(wallet);
        insertTx(userId, TxType.CREDIT, amount, reason, referenceId, newBalance);
        return newBalance;
    }

    /** Wydanie coins. Blokada wiersza → brak ujemnego salda nawet przy równoległych żądaniach. */
    @Transactional
    public int spend(Long userId, int amount, CoinReason reason, String referenceId) {
        if (amount <= 0) throw ApiException.badRequest("BAD_AMOUNT", "Kwota musi być dodatnia.");
        if (txRepository.existsByUserIdAndReasonAndReferenceIdAndType(userId, reason, referenceId, TxType.DEBIT)) {
            return balance(userId);
        }
        Wallet wallet = walletRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> ApiException.notFound("Brak portfela."));
        if (wallet.getBalance() < amount) {
            throw ApiException.paymentRequired("INSUFFICIENT_COINS",
                    "Za mało PURRE Coins (potrzeba " + amount + ", masz " + wallet.getBalance() + ").");
        }
        int newBalance = wallet.getBalance() - amount;
        wallet.setBalance(newBalance);
        walletRepository.save(wallet);
        insertTx(userId, TxType.DEBIT, amount, reason, referenceId, newBalance);
        return newBalance;
    }

    public boolean hasEnough(Long userId, int amount) {
        return balance(userId) >= amount;
    }

    private void insertTx(Long userId, TxType type, int amount, CoinReason reason, String referenceId, int balanceAfter) {
        try {
            txRepository.save(CoinTransaction.builder()
                    .userId(userId).type(type).amount(amount).reason(reason)
                    .referenceId(referenceId).balanceAfter(balanceAfter).createdAt(Instant.now())
                    .build());
        } catch (DataIntegrityViolationException e) {
            // wyścig dwóch transakcji o ten sam klucz — dokładnie raz to pożądana semantyka
            log.info("Ledger: duplikat ({}, {}, {}) zablokowany unikalnym kluczem.", userId, reason, referenceId);
            throw e;
        }
    }
}