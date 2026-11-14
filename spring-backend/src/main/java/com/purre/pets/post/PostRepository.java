package com.purre.pets.post;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findByOrderByCreatedAtDesc(Pageable pageable);
    List<Post> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /** 0.5.0: statystyki hodowcy (pakiet PRO+). */
    @Query("select coalesce(sum(p.likes), 0) from Post p where p.userId = :userId")
    long sumLikesByUserId(@Param("userId") Long userId);
}
