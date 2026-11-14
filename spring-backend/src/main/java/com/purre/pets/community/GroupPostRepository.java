package com.purre.pets.community;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GroupPostRepository extends JpaRepository<GroupPost, Long> {
    List<GroupPost> findTop50ByGroupIdOrderByCreatedAtDesc(Long groupId);
    List<GroupPost> findByUserIdOrderByIdDesc(Long userId);
}
