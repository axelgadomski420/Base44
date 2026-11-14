package com.purre.pets.community;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PollVoteRepository extends JpaRepository<PollVote, Long> {
    List<PollVote> findByPostIdIn(List<Long> postIds);
    Optional<PollVote> findByPostIdAndUserId(Long postId, Long userId);
}
