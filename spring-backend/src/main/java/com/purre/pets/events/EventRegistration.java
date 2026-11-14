package com.purre.pets.events;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "event_registrations")
@Getter
@Setter
@NoArgsConstructor
public class EventRegistration {

    @EmbeddedId
    private EventRegistrationId id;

    @Column(name = "registered_at", nullable = false)
    private LocalDateTime registeredAt = LocalDateTime.now();

    public EventRegistration(Long eventId, Long userId) {
        this.id = new EventRegistrationId(eventId, userId);
    }
}
