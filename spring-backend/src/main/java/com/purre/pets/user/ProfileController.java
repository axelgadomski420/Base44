package com.purre.pets.user;

import com.purre.pets.auth.dto.UserDto;
import com.purre.pets.security.UserPrincipal;
import com.purre.pets.user.dto.ChangePasswordRequest;
import com.purre.pets.user.dto.UpdateProfileRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/users/me")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @PatchMapping
    public UserDto update(@AuthenticationPrincipal UserPrincipal principal,
                          @Valid @RequestBody UpdateProfileRequest req) {
        return profileService.update(principal.id(), req);
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserDto avatar(@AuthenticationPrincipal UserPrincipal principal,
                          @RequestParam("file") MultipartFile file) {
        return profileService.uploadAvatar(principal.id(), file);
    }

    @PostMapping("/password")
    public ResponseEntity<Void> password(@AuthenticationPrincipal UserPrincipal principal,
                                         @Valid @RequestBody ChangePasswordRequest req) {
        profileService.changePassword(principal.id(), req);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(@AuthenticationPrincipal UserPrincipal principal) {
        String json = profileService.exportData(principal.id());
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=purre-pets-dane.json")
                .contentType(MediaType.APPLICATION_JSON)
                .body(json.getBytes());
    }

    @GetMapping
    public Map<String, Object> me(@AuthenticationPrincipal UserPrincipal principal) {
        return Map.of("id", principal.id());
    }
}