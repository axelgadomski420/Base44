package com.purre.pets.savedsearch;

import com.purre.pets.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saved-searches")
@RequiredArgsConstructor
public class SavedSearchController {

    private final SavedSearchService savedSearchService;

    @GetMapping
    public List<SavedSearch> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return savedSearchService.mine(principal.id());
    }

    @PostMapping
    public ResponseEntity<SavedSearch> create(@AuthenticationPrincipal UserPrincipal principal,
                                              @RequestBody SavedSearch body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(savedSearchService.create(principal.id(), body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        savedSearchService.delete(principal.id(), id);
        return ResponseEntity.noContent().build();
    }
}
