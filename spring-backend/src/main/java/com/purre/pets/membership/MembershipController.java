package com.purre.pets.membership;

import com.purre.pets.membership.MembershipService.MembershipStatus;
import com.purre.pets.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/membership")
@RequiredArgsConstructor
public class MembershipController {

    private final MembershipService membershipService;

    @GetMapping("/status")
    public MembershipStatus status(@AuthenticationPrincipal UserPrincipal principal) {
        return membershipService.status(principal.id());
    }

    @PostMapping("/purchase")
    public MembershipStatus purchase(@AuthenticationPrincipal UserPrincipal principal,
                                     @RequestBody Map<String, String> body) {
        return membershipService.purchase(principal.id(), body.get("plan"));
    }
}
