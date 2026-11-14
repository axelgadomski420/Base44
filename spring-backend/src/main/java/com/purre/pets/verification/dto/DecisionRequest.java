package com.purre.pets.verification.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DecisionRequest(
        @NotNull Boolean approved,
        @Size(max = 1000) String reason
) {}