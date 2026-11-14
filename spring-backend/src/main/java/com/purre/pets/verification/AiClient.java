package com.purre.pets.verification;

import com.purre.pets.config.AppProperties;
import lombok.Builder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Klient ai-service (FastAPI + Tesseract + Ollama/Qwen2.5:3b).
 * Zasada: AI tylko wspiera decyzję — zawsze zostaje human-in-the-loop.
 * Awaria/timeout AI ≠ awaria weryfikacji: wracamy z flagą fallback i decyzją manualną.
 */
@Slf4j
@Service
public class AiClient {

    private final RestClient restClient;
    private final int timeoutSeconds;

    public AiClient(AppProperties props) {
        this.timeoutSeconds = props.getAi().getTimeoutSeconds();
        this.restClient = RestClient.builder()
                .baseUrl(props.getAi().getBaseUrl())
                .build();
    }

    @Builder
    public record AnalysisResult(Integer riskScore, String analysis, List<String> flags, boolean aiAvailable) {}

    public AnalysisResult analyzeDocuments(List<FilePart> files) {
        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            for (FilePart f : files) {
                body.add("files", new ByteArrayResource(f.bytes()) {
                    @Override public String getFilename() { return f.name(); }
                });
            }
            Map<String, Object> resp = restClient.post()
                    .uri("/verify-analysis")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            if (resp == null) return fallback();
            Integer risk = resp.get("risk_score") instanceof Number n ? n.intValue() : null;
            @SuppressWarnings("unchecked")
            List<String> flags = resp.get("flags") instanceof List<?> l ? (List<String>) l : List.of();
            return AnalysisResult.builder()
                    .riskScore(risk)
                    .analysis(String.valueOf(resp.getOrDefault("analysis", "")))
                    .flags(flags)
                    .aiAvailable(true)
                    .build();
        } catch (Exception e) {
            log.warn("ai-service niedostępny ({}): fallback na decyzję manualną", e.getMessage());
            return fallback();
        }
    }

    private AnalysisResult fallback() {
        return AnalysisResult.builder()
                .riskScore(null)
                .analysis("Automatyczna analiza AI niedostępna — wymagana ręczna weryfikacja dokumentów przez administratora.")
                .flags(List.of("AI_FALLBACK"))
                .aiAvailable(false)
                .build();
    }

    public record FilePart(String name, byte[] bytes) {}
    public Duration timeout() { return Duration.ofSeconds(timeoutSeconds); }
}