package com.commentbox.api.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class HistoryStatsResponse {
    private long totalGenerates;
    private Map<String, Long> languageBreakdown;
    private long thisMonth;
}
