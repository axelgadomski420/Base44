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

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/listings")
@RequiredArgsConstructor
public class ListingController {

    private final ListingService listingService;

    /** 0.4.0: filtry ceny + sortowanie (NEWEST / PRICE_ASC / PRICE_DESC / DISTANCE). */
    @GetMapping
    public List<ListingDto> nearby(@RequestParam double lat,
                                   @RequestParam double lng,
                                   @RequestParam(defaultValue = "50") double radiusKm,
                                   @RequestParam(required = false) String species,
                                   @RequestParam(required = false) String breed,
                                   @RequestParam(required = false) String city,
                                   @RequestParam(required = false) String listingType,
                                   @RequestParam(required = false) BigDecimal minPrice,
                                   @RequestParam(required = false) BigDecimal maxPrice,
                                   @RequestParam(required = false) String sort,
                                   @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "24") int size) {
        return listingService.nearby(lat, lng, radiusKm, species, breed, city, listingType,
                minPrice, maxPrice, sort, page, size);
    }

    /** 0.4.0: podpowiedzi wyszukiwarki w czasie rzeczywistym (debounce po stronie frontendu). */
    @GetMapping("/suggest")
    public Map<String, List<String>> suggest(@RequestParam("q") String q) {
        return listingService.suggest(q);
    }

    /** HoloFeed — pionowy feed wideo (faza 3). */
    @GetMapping("/feed")
    public List<ListingDto> feed(@RequestParam(defaultValue = "20") int limit) {
        return listingService.feed(limit);
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
