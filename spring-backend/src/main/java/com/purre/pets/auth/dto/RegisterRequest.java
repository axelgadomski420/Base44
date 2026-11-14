package com.purre.pets.auth.dto;

import com.purre.pets.user.Role;
import jakarta.validation.constraints.*;

public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 100) String password,
        @NotNull Role role,
        @NotBlank @Size(min = 2, max = 120) String displayName,
        @Size(max = 500) String bio,
        @Size(max = 120) String city,
        @Size(max = 120) String region,
        @AssertTrue(message = "Zgoda RODO jest wymagana.") Boolean rodoConsent
) {}