package com.purre.pets.assistant;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/assistant")
@RequiredArgsConstructor
public class AssistantController {

    private final AssistantService assistantService;

    public record AskRequest(String question) {}

    @PostMapping
    public Map<String, String> ask(@RequestBody AskRequest req) {
        return Map.of("answer", assistantService.ask(req.question()));
    }
}