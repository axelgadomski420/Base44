package com.purre.pets.verification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AppealRequest(@NotBlank @Size(max = 1000) String message) {}