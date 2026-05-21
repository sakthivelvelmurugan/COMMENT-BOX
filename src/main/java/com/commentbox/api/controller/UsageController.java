package com.commentbox.api.controller;

import com.commentbox.api.model.User;
import com.commentbox.api.repository.UserRepository;
import com.commentbox.api.service.ApiKeyService;
import com.commentbox.api.service.UsageLimitService;
import com.commentbox.api.util.ApiException;
import com.commentbox.api.model.UsageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/v1/usage")
@RequiredArgsConstructor
public class UsageController {

    private final UserRepository userRepository;
    private final ApiKeyService apiKeyService;
    private final UsageLimitService usageLimitService;

    @GetMapping
    public ResponseEntity<UsageResponse> getUsage() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new ApiException("User not found", 401));

        boolean hasByok = apiKeyService.hasActiveKey(email, "openrouter");
        int dailyLimit = UsageLimitService.FREE_DAILY_LIMIT;
        int usedToday = user.getDailyGenerateCount() == null ? 0 : user.getDailyGenerateCount();
        int remaining = hasByok ? -1 : usageLimitService.getRemainingGenerates(user);

        LocalDateTime resetAt = LocalDateTime.now().with(LocalTime.MIDNIGHT).plusDays(1);
        String resetAtStr = resetAt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

        UsageResponse resp = UsageResponse.builder()
            .dailyLimit(dailyLimit)
            .usedToday(usedToday)
            .remaining(remaining)
            .resetAt(resetAtStr)
            .hasByok(hasByok)
            .byokProvider(hasByok ? "openrouter" : null)
            .build();

        return ResponseEntity.ok(resp);
    }
}
