package com.purre.pets.post;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findByOrderByCreatedAtDesc(Pageable pageable);
    List<Post> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
