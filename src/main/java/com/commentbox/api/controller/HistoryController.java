package com.commentbox.api.controller;

import com.commentbox.api.dto.HistoryItemResponse;
import com.commentbox.api.dto.HistoryStatsResponse;
import com.commentbox.api.model.CommentHistory;
import com.commentbox.api.model.User;
import com.commentbox.api.repository.CommentHistoryRepository;
import com.commentbox.api.repository.UserRepository;
import com.commentbox.api.util.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/history")
@RequiredArgsConstructor
public class HistoryController {

    private final CommentHistoryRepository historyRepo;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<Page<HistoryItemResponse>> listHistory(@AuthenticationPrincipal UserDetails userDetails,
                                                                 @RequestParam(defaultValue = "0") int page,
                                                                 @RequestParam(defaultValue = "20") int size) {
        if (size > 50) size = 50;
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow(() -> new ApiException("User not found"));
        Pageable p = PageRequest.of(page, size);
        Page<CommentHistory> results = historyRepo.findByUserOrderByCreatedAtDesc(user, p);
        Page<HistoryItemResponse> dto = results.map(HistoryItemResponse::from);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/{id}")
    public ResponseEntity<HistoryItemResponse> getOne(@AuthenticationPrincipal UserDetails userDetails, @PathVariable Long id) {
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow(() -> new ApiException("User not found"));
        CommentHistory h = historyRepo.findByIdAndUser(id, user).orElseThrow(() -> new ApiException("Not found", 404));
        return ResponseEntity.ok(HistoryItemResponse.from(h));
    }

    @DeleteMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Void> deleteOne(@AuthenticationPrincipal UserDetails userDetails, @PathVariable Long id) {
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow(() -> new ApiException("User not found"));
        historyRepo.findByIdAndUser(id, user).orElseThrow(() -> new ApiException("Not found", 404));
        historyRepo.deleteByIdAndUser(id, user);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Void> deleteAll(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow(() -> new ApiException("User not found"));
        historyRepo.deleteAllByUser(user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    public ResponseEntity<HistoryStatsResponse> stats(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow(() -> new ApiException("User not found"));
        long total = historyRepo.countByUser(user);
        LocalDateTime startOfMonth = LocalDateTime.now(ZoneId.systemDefault()).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        long thisMonth = historyRepo.countByUserAndCreatedAtAfter(user, startOfMonth);
        List<Object[]> counts = historyRepo.findLanguageCountsByUser(user);
        Map<String, Long> map = new HashMap<>();
        for (Object[] row : counts) {
            String lang = (String) row[0];
            Long cnt = (Long) row[1];
            map.put(lang, cnt);
        }
        HistoryStatsResponse resp = HistoryStatsResponse.builder()
                .totalGenerates(total)
                .languageBreakdown(map)
                .thisMonth(thisMonth)
                .build();

        return ResponseEntity.ok(resp);
    }
}
