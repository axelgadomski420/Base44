package com.purre.pets.scheduler;

import com.purre.pets.verification.VerificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DocumentRetentionScheduler {

    private final VerificationService verificationService;

    @Scheduled(cron = "${purre.retention.purge-cron:0 0 4 * * *}")
    public void purge() {
        log.info("Uruchamiam retencję dokumentów weryfikacji (RODO, 30 dni po decyzji).");
        verificationService.purgeExpired();
    }
}