package com.purre.pets.listing;

import com.purre.pets.common.ApiException;
import com.purre.pets.common.RateLimiter;
import com.purre.pets.common.VideoEditService;
import com.purre.pets.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Edytor wideo: POST /media/video-edit (multipart).
 * Parametry: url, trimStart, trimEnd, mute, speed, videoVolume, musicVolume, music (opcjonalny plik audio).
 * Zwraca { url } nowego pliku MP4 w storage.
 */
@RestController
@RequestMapping("/media")
@RequiredArgsConstructor
public class VideoEditController {

    private final VideoEditService videoEditService;
    private final RateLimiter rateLimiter;

    @PostMapping(value = "/video-edit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> edit(@AuthenticationPrincipal UserPrincipal principal,
                                    @RequestParam("url") String url,
                                    @RequestParam(value = "trimStart", defaultValue = "0") Double trimStart,
                                    @RequestParam(value = "trimEnd", required = false) Double trimEnd,
                                    @RequestParam(value = "mute", defaultValue = "false") Boolean mute,
                                    @RequestParam(value = "speed", defaultValue = "1") Double speed,
                                    @RequestParam(value = "videoVolume", defaultValue = "1") Double videoVolume,
                                    @RequestParam(value = "musicVolume", defaultValue = "0.5") Double musicVolume,
                                    @RequestParam(value = "music", required = false) MultipartFile music) {
        if (!rateLimiter.allow("video-edit:" + principal.id(), 10, 60_000)) {
            throw ApiException.tooMany("Zbyt wiele renderów — odczekaj chwilę.");
        }
        byte[] musicBytes = null;
        String musicCt = null;
        String musicName = null;
        if (music != null && !music.isEmpty()) {
            try { musicBytes = music.getBytes(); } catch (Exception e) {
                throw ApiException.badRequest("MUSIC_READ_ERROR", "Nie udało się odczytać pliku audio.");
            }
            musicCt = music.getContentType();
            musicName = music.getOriginalFilename();
        }
        String newUrl = videoEditService.edit(url,
                new VideoEditService.EditOptions(trimStart, trimEnd, Boolean.TRUE.equals(mute), speed, videoVolume, musicVolume),
                musicBytes, musicCt, musicName);
        return Map.of("url", newUrl);
    }
}