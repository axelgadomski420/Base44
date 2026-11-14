package com.purre.pets.admin;

import com.purre.pets.auth.dto.UserDto;
import com.purre.pets.common.ApiException;
import com.purre.pets.user.Role;
import com.purre.pets.user.User;
import com.purre.pets.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Panel administratora: przegląd użytkowników i nadawanie ról (MODERATOR, ADMIN…).
 * Operacje chronione @PreAuthorize + /admin/** ma hasRole('ADMIN') w SecurityConfig.
 */
@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserRepository userRepository;

    @GetMapping
    public Page<UserDto> list(@RequestParam(required = false) String query,
                              @RequestParam(defaultValue = "0") int page,
                              @RequestParam(defaultValue = "30") int size) {
        PageRequest pr = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        if (query == null || query.isBlank()) {
            return userRepository.findAll(pr).map(UserDto::from);
        }
        return userRepository.search(query.trim(), pr).map(UserDto::from);
    }

    public record RoleRequest(String role) {}

    @PostMapping("/{id}/role")
    public UserDto setRole(@PathVariable Long id, @RequestBody RoleRequest req) {
        Role role;
        try {
            role = Role.valueOf(req.role().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("BAD_ROLE", "Nieznana rola.");
        }
        User user = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("Użytkownik nie istnieje."));
        user.setRole(role);
        return UserDto.from(userRepository.save(user));
    }
}