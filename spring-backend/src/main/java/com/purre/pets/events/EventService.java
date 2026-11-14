package com.purre.pets.events;

import com.purre.pets.coins.CoinReason;
import com.purre.pets.coins.CoinService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final EventRegistrationRepository registrationRepository;
    private final CoinService coinService;

    @Transactional(readOnly = true)
    public List<EventDto> upcoming() {
        LocalDateTime now = LocalDateTime.now();
        return eventRepository.findAllByOrderByStartsAtAsc().stream()
                .filter(e -> e.getEndsAt() == null || e.getEndsAt().isAfter(now))
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public EventDto get(Long id) {
        return eventRepository.findById(id).map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono wydarzenia"));
    }

    @Transactional
    public EventDto create(Long adminId, EventDto req) {
        Event e = new Event();
        e.setTitle(req.title());
        e.setDescription(req.description());
        e.setKind(Event.Kind.valueOf(req.kind()));
        e.setCity(req.city());
        e.setRegion(req.region());
        e.setStartsAt(req.startsAt());
        e.setEndsAt(req.endsAt());
        e.setTicketCost(Math.max(0, req.ticketCost()));
        e.setCreatedBy(adminId);
        return toDto(eventRepository.save(e));
    }

    /** Zapis na wydarzenie — płatne bilety pobierane z PURRE Coins (idempotentnie po referenceId). */
    @Transactional
    public EventDto register(Long userId, Long eventId) {
        Event e = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono wydarzenia"));
        EventRegistrationId rid = new EventRegistrationId(eventId, userId);
        if (registrationRepository.existsById(rid)) {
            return toDto(e);
        }
        if (e.getTicketCost() > 0) {
            coinService.spend(userId, e.getTicketCost(), CoinReason.EVENT_TICKET, "event:" + eventId);
        }
        registrationRepository.save(new EventRegistration(eventId, userId));
        return toDto(e);
    }

    /** Rezygnacja — bilety płatne nie podlegają zwrotowi Coins (brak wypłat / brak zwrotów). */
    @Transactional
    public void unregister(Long userId, Long eventId) {
        registrationRepository.deleteById(new EventRegistrationId(eventId, userId));
    }

    @Transactional(readOnly = true)
    public List<EventDto> mine(Long userId) {
        return registrationRepository.findEventIdsByUserId(userId).stream()
                .map(this::get)
                .toList();
    }

    private EventDto toDto(Event e) {
        long going = registrationRepository.countByEventId(e.getId());
        return new EventDto(e.getId(), e.getTitle(), e.getDescription(), e.getKind().name(),
                e.getCity(), e.getRegion(), e.getStartsAt(), e.getEndsAt(), e.getTicketCost(), going);
    }
}
