package com.purre.pets.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TwoFaCodeRequest(@NotBlank @Size(min = 6, max = 8) String code) {}