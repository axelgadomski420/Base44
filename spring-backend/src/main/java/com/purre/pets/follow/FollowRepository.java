package com.purre.pets.follow;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FollowRepository extends JpaRepository<Follow, FollowId> {

    long countByIdBreederId(Long breederId);

    boolean existsById(FollowId id);
}
