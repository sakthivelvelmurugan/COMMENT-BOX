package com.commentbox.api.service;

import com.commentbox.api.model.CommentRequest;
import com.commentbox.api.model.CommentResponse;
import com.commentbox.api.util.ApiException;
import com.commentbox.api.util.PromptBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommentService {

    private final PromptBuilder promptBuilder;
    private final WebClient openRouterWebClient;

    @Value("${openrouter.model}")
    private String model;

    @Value("${openrouter.api.key:}")
    private String platformApiKey;

    public CommentResponse generateComment(CommentRequest request) {
        String code = sanitizeCode(request.getCode());
        String prompt = promptBuilder.buildPrompt(request.getLanguage(), request.getStyle(), request.getDensity(), code);

        boolean byokActive = request.getApiKey() != null && !request.getApiKey().trim().isEmpty();
        String apiKeyToUse = byokActive ? request.getApiKey().trim() : normalizeApiKey(platformApiKey);

        if (apiKeyToUse == null || apiKeyToUse.isBlank()) {
            throw new ApiException("API key not configured. Provide your own key in the browser or set OPENROUTER_API_KEY on the backend.", 400);
        }

        OpenRouterResponse response;
        try {
            Map<String, Object> payload = Map.of(
                "model", model,
                "max_tokens", 4096,
                "messages", List.of(Map.of("role", "user", "content", prompt))
            );
            response = openRouterWebClient.post()
                .headers(h -> h.setBearerAuth(apiKeyToUse))
                .bodyValue(Objects.requireNonNull(payload))
                .retrieve()
                .bodyToMono(OpenRouterResponse.class)
                .block();
        } catch (WebClientResponseException ex) {
            log.error("OpenRouter API error", ex);
            throw new ApiException("OpenRouter API error: " + ex.getResponseBodyAsString(), ex);
        } catch (Exception ex) {
            log.error("Unexpected error calling OpenRouter", ex);
            throw new ApiException("Failed to generate comments", ex);
        }

        if (response == null || response.getChoices() == null || response.getChoices().isEmpty() || response.getChoices().get(0).getMessage() == null) {
            throw new ApiException("OpenRouter returned an empty response");
        }

        String raw = response.getChoices().get(0).getMessage().getContent();
        String outputCode = stripCodeFences(raw);
        boolean finalByokActive = byokActive;

        return CommentResponse.builder()
            .language(request.getLanguage())
            .outputCode(outputCode)
            .generatesRemaining(finalByokActive ? -1 : 0)
            .byokActive(finalByokActive)
            .provider("openrouter")
            .historyId(null)
            .build();
    }

    private String normalizeApiKey(String key) {
        if (key == null) {
            return null;
        }
        String trimmed = key.trim();
        if (trimmed.isBlank() || trimmed.contains("${") || trimmed.contains("}") || trimmed.startsWith("env:")) {
            return null;
        }
        return trimmed;
    }

    private String sanitizeCode(String code) {
        if (code == null) return "";
        String trimmed = code.trim();
        if (trimmed.indexOf('\0') >= 0) {
            throw new ApiException("Invalid character in code input");
        }
        return trimmed;
    }

    private String stripCodeFences(String text) {
        if (text == null) {
            return "";
        }
        return text.replaceAll("(?m)^```[\\w]*\\s*", "")
            .replaceAll("(?m)```$", "")
            .trim();
    }

    private static class OpenRouterResponse {
        private List<Choice> choices;

        public List<Choice> getChoices() {
            return choices;
        }
    }

    private static class Choice {
        private Message message;

        public Message getMessage() {
            return message;
        }
    }

    private static class Message {
        private String content;

        public String getContent() {
            return content;
        }
    }
}
