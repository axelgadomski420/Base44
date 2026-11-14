package com.purre.pets.community;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PollOptionRepository extends JpaRepository<PollOption, Long> {
    List<PollOption> findByPostIdOrderByPositionAsc(Long postId);
    List<PollOption> findByPostIdIn(List<Long> postIds);
}
