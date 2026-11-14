package com.purre.pets.ads;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface AdCampaignRepository extends JpaRepository<AdCampaign, Long> {
    List<AdCampaign> findByActiveTrueAndActiveFromBeforeAndActiveUntilAfter(Instant from, Instant until);
    List<AdCampaign> findByAdvertiserIdOrderByCreatedAtDesc(Long advertiserId);
}