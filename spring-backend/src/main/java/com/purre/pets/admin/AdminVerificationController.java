package com.purre.pets.admin;

import com.purre.pets.verification.*;
import com.purre.pets.verification.dto.DecisionRequest;
import com.purre.pets.verification.dto.VerificationDto;
import com.purre.pets.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/verifications")
@RequiredArgsConstructor
public class AdminVerificationController {

    private final VerificationService verificationService;

    @GetMapping
    public List<VerificationDto> list(@RequestParam(defaultValue = "PENDING") VerificationStatus status) {
        return verificationService.listByStatus(status);
    }

    @PostMapping("/{id}/decision")
    public VerificationDto decide(@AuthenticationPrincipal UserPrincipal admin,
                                  @PathVariable Long id,
                                  @Valid @RequestBody DecisionRequest req) {
        return verificationService.decide(id, admin.id(), req);
    }
}