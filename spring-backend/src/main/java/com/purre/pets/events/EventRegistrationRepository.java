package com.purre.pets.events;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface EventRegistrationRepository extends JpaRepository<EventRegistration, EventRegistrationId> {

    boolean existsById(EventRegistrationId id);

    @Query("select count(r) from EventRegistration r where r.id.eventId = :eventId")
    long countByEventId(Long eventId);

    @Query("select r.id.eventId from EventRegistration r where r.id.userId = :userId order by r.id.eventId")
    List<Long> findEventIdsByUserId(Long userId);
}
