package com.purre.pets.events;

import java.time.LocalDateTime;

public record EventDto(
        Long id,
        String title,
        String description,
        String kind,
        String city,
        String region,
        LocalDateTime startsAt,
        LocalDateTime endsAt,
        int ticketCost,
        long going
) {
}
