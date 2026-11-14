package com.purre.pets.listing;

import com.purre.pets.listing.dto.*;
import com.purre.pets.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/listings")
@RequiredArgsConstructor
public class ListingController {

    private final ListingService listingService;

    @GetMapping
    public List<ListingDto> nearby(@RequestParam double lat,
                                   @RequestParam double lng,
                                   @RequestParam(defaultValue = "50") double radiusKm,
                                   @RequestParam(required = false) String species,
                                   @RequestParam(required = false) String breed,
                                   @RequestParam(required = false) String city,
                                   @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "24") int size) {
        return listingService.nearby(lat, lng, radiusKm, species, breed, city, page, size);
    }

    @GetMapping("/{id}")
    public ListingDto get(@PathVariable Long id) {
        return listingService.get(id);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('BREEDER')")
    public List<ListingDto> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return listingService.mine(principal.id());
    }

    @PostMapping
    @PreAuthorize("hasRole('BREEDER')")
    public ResponseEntity<ListingDto> create(@AuthenticationPrincipal UserPrincipal principal,
                                             @Valid @RequestBody CreateListingRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(listingService.create(principal.id(), req));
    }

    @PostMapping("/{id}/feature")
    @PreAuthorize("hasRole('BREEDER')")
    public ListingDto feature(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return listingService.feature(principal.id(), id);
    }

    @PostMapping("/boost-profile")
    @PreAuthorize("hasRole('BREEDER')")
    public Map<String, Object> boostProfile(@AuthenticationPrincipal UserPrincipal principal) {
        return Map.of("balance", listingService.boostProfile(principal.id()));
    }

    @PatchMapping("/{id}/sold")
    @PreAuthorize("hasRole('BREEDER')")
    public ResponseEntity<Void> markSold(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        listingService.markSold(principal.id(), id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('BREEDER')")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        listingService.delete(principal.id(), id);
        return ResponseEntity.noContent().build();
    }
}