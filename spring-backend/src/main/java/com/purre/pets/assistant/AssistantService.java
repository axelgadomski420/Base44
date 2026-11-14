package com.purre.pets.assistant;

import com.purre.pets.common.ApiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * PURRE Assistant (faza 3, wzorzec Adoptek): doradca AI (Qwen2.5 3B) — pytania o rasy,
 * pielęgnację, przygotowanie do adopcji. Odpowiedzi informacyjne; nigdy nie zastępuje weterynarza.
 */
@Slf4j
@Service
public class AssistantService {

    private final RestClient restClient;

    public AssistantService(com.purre.pets.config.AppProperties props) {
        this.restClient = RestClient.builder()
                .baseUrl(props.getAi().getBaseUrl())
                .build();
    }

    @SuppressWarnings("unchecked")
    public String ask(String question) {
        if (question == null || question.isBlank()) {
            throw ApiException.badRequest("EMPTY_QUESTION", "Zadaj pytanie.");
        }
        try {
            Map<String, Object> resp = restClient.post()
                    .uri("/assistant")
                    .body(Map.of("question", question.trim().substring(0, Math.min(1000, question.trim().length()))))
                    .retrieve()
                    .body(Map.class);
            Object answer = resp == null ? null : resp.get("answer");
            if (answer == null || String.valueOf(answer).isBlank()) {
                return FALLBACK;
            }
            return String.valueOf(answer);
        } catch (Exception e) {
            log.warn("Assistant: AI niedostępne ({}), zwracam odpowiedź zastępczą.", e.getMessage());
            return FALLBACK;
        }
    }

    private static final String FALLBACK = """
            Asystent AI jest chwilowo niedostępny. Podpowiedzi na start:
            • Szukasz hodowli? Sprawdź badge ✅ „Zweryfikowany hodowca" — to legalna hodowla z dokumentami ZKwP/FCI.
            • Przed adopcją: szczepienia, chip, umowa, dokumentacja zdrowotna.
            • Kupujesz zwierzę? Odbiór osobisty + podgląd warunków w hodowli to podstawa.
            """;
}