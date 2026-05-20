package com.commentbox.api.dto;

import com.commentbox.api.model.CommentHistory;
import lombok.Builder;
import lombok.Data;

import java.time.format.DateTimeFormatter;

@Data
@Builder
public class HistoryItemResponse {
    private Long id;
    private String language;
    private String style;
    private String density;
    private String inputCode;
    private String outputCode;
    private String createdAt;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm");

    public static HistoryItemResponse from(CommentHistory h) {
        return HistoryItemResponse.builder()
                .id(h.getId())
                .language(h.getLanguage())
                .style(h.getStyle())
                .density(h.getDensity())
                .inputCode(h.getInputCode())
                .outputCode(h.getOutputCode())
                .createdAt(h.getCreatedAt() != null ? h.getCreatedAt().format(FMT) : "")
                .build();
    }
}
