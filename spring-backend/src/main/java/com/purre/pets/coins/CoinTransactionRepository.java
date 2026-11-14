package com.purre.pets.coins;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface CoinTransactionRepository extends JpaRepository<CoinTransaction, Long> {
    Page<CoinTransaction> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    boolean existsByUserIdAndReasonAndReferenceIdAndType(Long userId, CoinReason reason, String referenceId, TxType type);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM CoinTransaction t WHERE t.userId = :userId AND t.type = 'DEBIT' AND t.reason = :reason AND t.createdAt >= :since")
    int sumDebitSince(Long userId, CoinReason reason, Instant since);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM CoinTransaction t WHERE t.reason = 'ARCADE_REWARD' AND t.userId = :userId AND t.createdAt >= :since")
    int sumArcadeCoinsSince(Long userId, Instant since);
}