package com.commentbox.api.model;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class SharedSnippetResponse {
    private String language;
    private String outputCode;
    private String style;
    private LocalDateTime createdAt;
}
