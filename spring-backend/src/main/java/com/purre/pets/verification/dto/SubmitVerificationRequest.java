package com.purre.pets.verification.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubmitVerificationRequest(
        @NotBlank @Size(max = 120) String kennelNumber,
        @NotBlank @Size(max = 120) String kennelUnion,
        @AssertTrue(message = "Zgoda RODO na przetwarzanie dokumentów jest wymagana.") Boolean rodoConsent
) {}