package com.commentbox.api.service;

import com.commentbox.api.model.CommentRequest;
import com.commentbox.api.model.CommentResponse;
import com.commentbox.api.model.CommentHistory;
import com.commentbox.api.model.User;
import com.commentbox.api.repository.CommentHistoryRepository;
import com.commentbox.api.repository.UserRepository;
import com.commentbox.api.util.ApiException;
import com.commentbox.api.util.PromptBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final ApiKeyService apiKeyService;
    private final UsageLimitService usageLimitService;
    private final CommentHistoryRepository commentHistoryRepository;
    private final UserRepository userRepository;

    @Value("${openrouter.model}")
    private String model;

    @Value("${openrouter.api.key:}")
    private String platformApiKey;

    public CommentResponse generateComment(CommentRequest request) {
        // sanitize input
        String code = sanitizeCode(request.getCode());
        String prompt = promptBuilder.buildPrompt(request.getLanguage(), request.getStyle(), request.getDensity(), code);
        boolean byokActive = false;
        int generatesRemaining = 0;
        String apiKeyToUse;
        OpenRouterResponse response;
        try {
            // Resolve API key and enforce usage limits for the current user
            String userEmail = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(userEmail).orElseThrow(() -> new ApiException("User not found", 401));

            if (apiKeyService.hasActiveKey(userEmail, "openrouter")) {
                // BYOK user — use their key and skip limits
                byokActive = true;
                apiKeyToUse = apiKeyService.resolveKey(userEmail, "openrouter");
            } else {
                // Free-tier user — enforce daily limit
                usageLimitService.checkAndIncrement(user);
                apiKeyToUse = platformApiKey;
            }

            if (apiKeyToUse == null || apiKeyToUse.trim().isEmpty()) {
                throw new ApiException("API key not configured. Please set OPENROUTER_API_KEY or provide your own key in settings.", 500);
            }
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
        } catch (ApiException ex) {
            // propagate our ApiException as-is
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error calling OpenRouter", ex);
            throw new ApiException("Failed to generate comments", ex);
        }

        if (response == null || response.getChoices() == null || response.getChoices().isEmpty() || response.getChoices().get(0).getMessage() == null) {
            throw new ApiException("OpenRouter returned an empty response");
        }

        String raw = response.getChoices().get(0).getMessage().getContent();
        String outputCode = stripCodeFences(raw);
        generatesRemaining = calculateGeneratesRemaining(response);

        // Persist history record for the authenticated user
        Long historyId = null;
        try {
            String userEmail = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(userEmail).orElse(null);
            if (user != null) {
                CommentHistory history = CommentHistory.builder()
                        .user(user)
                        .language(request.getLanguage())
                        .style(request.getStyle())
                        .density(request.getDensity())
                        .inputCode(request.getCode())
                        .outputCode(outputCode)
                        .build();
                if (history != null) {
                    CommentHistory saved = commentHistoryRepository.save(history);
                    historyId = saved.getId();
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to save comment history", ex);
        }
        // compute remaining after successful generate
        try {
            String userEmail = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(userEmail).orElse(null);
            if (byokActive) {
                generatesRemaining = -1;
            } else if (user != null) {
                generatesRemaining = usageLimitService.getRemainingGenerates(user);
            }
        } catch (Exception e) {
            generatesRemaining = 0;
        }

        return CommentResponse.builder()
            .language(request.getLanguage())
            .outputCode(outputCode)
            .generatesRemaining(generatesRemaining)
            .byokActive(byokActive)
            .provider("openrouter")
            .historyId(historyId)
            .build();
    }

    private String sanitizeCode(String code) {
        if (code == null) return "";
        String trimmed = code.trim();
        if (trimmed.indexOf('\0') >= 0) {
            throw new ApiException("Invalid character in code input");
        }
        return trimmed;
    }

    private int calculateGeneratesRemaining(OpenRouterResponse response) {
        return response.getUsage() != null ? Math.max(0, 1) : 1;
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
        private Usage usage;

        public List<Choice> getChoices() {
            return choices;
        }

        public Usage getUsage() {
            return usage;
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

    @SuppressWarnings("unused")
    private static class Usage {
        private int total_tokens;

        public int getTotal_tokens() {
            return total_tokens;
        }
    }
}
