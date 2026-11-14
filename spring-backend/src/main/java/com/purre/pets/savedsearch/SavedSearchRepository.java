package com.purre.pets.savedsearch;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SavedSearchRepository extends JpaRepository<SavedSearch, Long> {
    List<SavedSearch> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<SavedSearch> findByUserId(Long userId);
}
