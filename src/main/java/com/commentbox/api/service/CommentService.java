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

@Service
@RequiredArgsConstructor
@Slf4j
public class CommentService {

    private final PromptBuilder promptBuilder;
    private final WebClient openRouterWebClient;

    @Value("${openrouter.model}")
    private String model;

    public CommentResponse generateComment(CommentRequest request) {
        String prompt = promptBuilder.buildPrompt(request.getLanguage(), request.getStyle(), request.getDensity(), request.getCode());

        OpenRouterResponse response;
        try {
            response = openRouterWebClient.post()
                .bodyValue(Map.of(
                    "model", model,
                    "max_tokens", 4096,
                    "messages", List.of(Map.of("role", "user", "content", prompt))
                ))
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
        int generatesRemaining = calculateGeneratesRemaining(response);

        return CommentResponse.builder()
            .language(request.getLanguage())
            .outputCode(outputCode)
            .generatesRemaining(generatesRemaining)
            .build();
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

    private static class Usage {
        private int total_tokens;

        public int getTotal_tokens() {
            return total_tokens;
        }
    }
}
