package com.purre.pets.coins;

import com.purre.pets.common.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CoinServiceTest {

    @Mock private WalletRepository walletRepository;
    @Mock private CoinTransactionRepository txRepository;
    private CoinService coinService;

    @BeforeEach
    void setUp() {
        coinService = new CoinService(walletRepository, txRepository);
    }

    @Test
    void spendRejectsWhenBalanceTooLow() {
        when(txRepository.existsByUserIdAndReasonAndReferenceIdAndType(1L, CoinReason.LISTING_PUBLISH, "listing:9", TxType.DEBIT))
                .thenReturn(false);
        when(walletRepository.findByUserIdForUpdate(1L))
                .thenReturn(Optional.of(Wallet.builder().userId(1L).balance(30).version(0L).build()));

        assertThatThrownBy(() -> coinService.spend(1L, 50, CoinReason.LISTING_PUBLISH, "listing:9"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Za mało PURRE Coins");
    }

    @Test
    void spendIsIdempotentOnRetry() {
        when(txRepository.existsByUserIdAndReasonAndReferenceIdAndType(1L, CoinReason.LISTING_PUBLISH, "listing:9", TxType.DEBIT))
                .thenReturn(true);
        when(walletRepository.findByUserId(1L))
                .thenReturn(Optional.of(Wallet.builder().userId(1L).balance(150).version(1L).build()));

        int balance = coinService.spend(1L, 50, CoinReason.LISTING_PUBLISH, "listing:9");
        assertThat(balance).isEqualTo(150);
    }

    @Test
    void earnAddsBalance() {
        when(txRepository.existsByUserIdAndReasonAndReferenceIdAndType(any(), any(), any(), any())).thenReturn(false);
        when(walletRepository.findByUserIdForUpdate(1L))
                .thenReturn(Optional.of(Wallet.builder().userId(1L).balance(100).version(0L).build()));
        when(txRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(walletRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        int balance = coinService.earn(1L, 500, CoinReason.COIN_PURCHASE, "cs_test_123");
        assertThat(balance).isEqualTo(600);
    }
}