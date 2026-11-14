package com.purre.pets.events;

import com.purre.pets.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @GetMapping
    public List<EventDto> upcoming() {
        return eventService.upcoming();
    }

    @GetMapping("/mine")
    public List<EventDto> mine(@AuthenticationPrincipal UserPrincipal user) {
        return eventService.mine(user.id());
    }

    @GetMapping("/{id}")
    public EventDto get(@PathVariable Long id) {
        return eventService.get(id);
    }

    @PostMapping("/{id}/register")
    public EventDto register(@AuthenticationPrincipal UserPrincipal user, @PathVariable Long id) {
        return eventService.register(user.id(), id);
    }

    @DeleteMapping("/{id}/register")
    public void unregister(@AuthenticationPrincipal UserPrincipal user, @PathVariable Long id) {
        eventService.unregister(user.id(), id);
    }

    /** Tworzenie wydarzeń — tylko administrator (sprawdzenie roli w kontrolerze). */
    @PostMapping
    public EventDto create(@AuthenticationPrincipal UserPrincipal admin, @RequestBody EventDto req) {
        requireAdmin();
        return eventService.create(admin.id(), req);
    }

    private void requireAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        if (!isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Wymagana rola administratora");
        }
    }
}
