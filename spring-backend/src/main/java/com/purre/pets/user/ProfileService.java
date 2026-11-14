package com.purre.pets.user;

import com.purre.pets.auth.dto.UserDto;
import com.purre.pets.common.ApiException;
import com.purre.pets.common.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Edycja profilu: dane, avatar (upload), zmiana hasła, eksport danych RODO.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;
    private final StorageService storageService;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserDto update(Long userId, com.purre.pets.user.dto.UpdateProfileRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Użytkownik nie istnieje."));
        if (req.displayName() != null) {
            if (req.displayName().isBlank()) throw ApiException.badRequest("BAD_NAME", "Nazwa nie może być pusta.");
            user.setDisplayName(req.displayName().trim());
        }
        if (req.bio() != null) user.setBio(req.bio());
        if (req.city() != null) user.setCity(req.city());
        if (req.region() != null) user.setRegion(req.region());
        if (req.website() != null) user.setWebsite(req.website());
        if (req.instagram() != null) user.setInstagram(req.instagram());
        if (req.facebook() != null) user.setFacebook(req.facebook());
        if (req.tiktok() != null) user.setTiktok(req.tiktok());
        if (req.youtube() != null) user.setYoutube(req.youtube());
        return UserDto.from(userRepository.save(user));
    }

    @Transactional
    public UserDto uploadAvatar(Long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("FILE_EMPTY", "Plik jest pusty.");
        String ct = file.getContentType();
        if (ct == null || !storageService.isAllowedImage(ct)) {
            throw ApiException.badRequest("FILE_TYPE", "Avatar: dozwolone JPG, PNG lub WEBP.");
        }
        try {
            String url = storageService.storeMedia(file.getBytes(), ct, file.getOriginalFilename());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> ApiException.notFound("Użytkownik nie istnieje."));
            user.setAvatarUrl(url);
            return UserDto.from(userRepository.save(user));
        } catch (java.io.IOException e) {
            throw ApiException.badRequest("FILE_READ_ERROR", "Nie udało się odczytać pliku.");
        }
    }

    @Transactional
    public void changePassword(Long userId, com.purre.pets.user.dto.ChangePasswordRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Użytkownik nie istnieje."));
        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw ApiException.badRequest("WRONG_PASSWORD", "Aktualne hasło jest nieprawidłowe.");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
        log.info("Zmiana hasła user={}", userId);
    }

    /** Eksport danych osobowych (RODO, art. 15) — JSON do pobrania. */
    @Transactional(readOnly = true)
    public String exportData(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Użytkownik nie istnieje."));
        UserDto dto = UserDto.from(user);
        return """
                {
                  "export": "PURRE PETS — eksport danych (RODO art. 15)",
                  "generatedAt": "%s",
                  "profile": %s
                }
                """.formatted(java.time.Instant.now(), toPrettyJson(dto));
    }

    private String toPrettyJson(Object o) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper()
                    .writerWithDefaultPrettyPrinter().writeValueAsString(o);
        } catch (Exception e) {
            return String.valueOf(o);
        }
    }
}