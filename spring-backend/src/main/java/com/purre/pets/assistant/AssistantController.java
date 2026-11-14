package com.purre.pets.assistant;

import com.purre.pets.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/assistant")
@RequiredArgsConstructor
public class AssistantController {

    private final AssistantService assistantService;

    public record AskRequest(String question) {}

    @PostMapping
    public Map<String, String> ask(@RequestBody AskRequest req,
                                   @AuthenticationPrincipal UserPrincipal principal) {
        // Kontekst rozmowy per użytkownik (Redis w ai-service, TTL 30 min).
        String sessionId = principal == null ? null : "user-" + principal.id();
        return Map.of("answer", assistantService.ask(req.question(), sessionId));
    }
}
