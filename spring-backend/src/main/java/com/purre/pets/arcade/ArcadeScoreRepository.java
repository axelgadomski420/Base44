package com.purre.pets.arcade;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface ArcadeScoreRepository extends JpaRepository<ArcadeScore, Long> {

    @Query("SELECT s.userId, SUM(s.score) FROM ArcadeScore s WHERE s.createdAt >= :since GROUP BY s.userId ORDER BY SUM(s.score) DESC")
    List<Object[]> weeklyTotalsSince(Instant since);

    @Query("SELECT COALESCE(SUM(s.xpAwarded), 0) FROM ArcadeScore s WHERE s.userId = :userId")
    int totalXp(Long userId);
}