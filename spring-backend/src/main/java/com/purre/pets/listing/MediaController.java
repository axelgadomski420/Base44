package com.purre.pets.listing;

import com.purre.pets.common.ApiException;
import com.purre.pets.common.RateLimiter;
import com.purre.pets.common.StorageService;
import com.purre.pets.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Upload mediów ogłoszeń: JPG/PNG/WEBP (max 10 MB) i MP4/WEBM (max 10 MB w tym endpointcie —
 * dłuższe wideo HoloFeed trafi do osobnego pipeline'u w fazie 3).
 */
@RestController
@RequestMapping("/media")
@RequiredArgsConstructor
public class MediaController {

    private final StorageService storageService;
    private final RateLimiter rateLimiter;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> upload(@AuthenticationPrincipal UserPrincipal principal,
                                      @RequestParam("file") MultipartFile file) {
        if (!rateLimiter.allow("media:" + principal.id(), 30, 60_000)) {
            throw ApiException.tooMany("Zbyt wiele uploadów — odczekaj chwilę.");
        }
        if (file.isEmpty()) throw ApiException.badRequest("FILE_EMPTY", "Plik jest pusty.");
        String ct = file.getContentType();
        boolean image = ct != null && storageService.isAllowedImage(ct);
        boolean video = ct != null && storageService.isAllowedVideo(ct);
        if (!image && !video) {
            throw ApiException.badRequest("FILE_TYPE", "Dozwolone formaty: JPG, PNG, WEBP, MP4, WEBM.");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception e) {
            throw ApiException.badRequest("FILE_READ_ERROR", "Nie udało się odczytać pliku.");
        }
        String url = storageService.storeMedia(bytes, ct, file.getOriginalFilename());
        return Map.of("url", url, "mediaType", image ? "IMAGE" : "VIDEO");
    }
}