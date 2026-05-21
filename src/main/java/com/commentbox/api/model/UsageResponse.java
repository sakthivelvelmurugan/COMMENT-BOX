package com.commentbox.api.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UsageResponse {
    private int dailyLimit;
    private int usedToday;
    private int remaining;
    private String resetAt;
    private boolean hasByok;
    private String byokProvider;
}
