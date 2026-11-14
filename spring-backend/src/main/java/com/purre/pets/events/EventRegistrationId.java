package com.purre.pets.events;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class EventRegistrationId implements Serializable {
    private Long eventId;
    private Long userId;
}
