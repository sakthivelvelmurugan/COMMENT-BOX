package com.commentbox.api.controller;

import com.commentbox.api.model.CommentHistory;
import com.commentbox.api.model.SharedSnippetResponse;
import com.commentbox.api.repository.CommentHistoryRepository;
import com.commentbox.api.util.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ShareController {

    private final CommentHistoryRepository commentHistoryRepository;

    @PostMapping("/api/v1/history/{id}/share")
    public ResponseEntity<?> share(jakarta.servlet.http.HttpServletRequest request, @PathVariable Long id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        if (id == null) throw new ApiException("Invalid ID", 400);
        CommentHistory h = commentHistoryRepository.findById(id).orElseThrow(() -> new ApiException("Not found", 404));
        if (!h.getUser().getEmail().equals(email)) throw new ApiException("Forbidden", 403);
        String uuid = UUID.randomUUID().toString();
        h.setShareUuid(uuid);
        h.setIsShared(true);
        commentHistoryRepository.save(h);
        
        String scheme = request.getScheme();
        String host = request.getHeader("Host");
        String shareUrl = scheme + "://" + host + "/s/" + uuid;
        
        return ResponseEntity.ok().body(java.util.Map.of("shareUrl", shareUrl));
    }

    @GetMapping("/s/{uuid}")
    public void forwardShared(jakarta.servlet.http.HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response) throws Exception {
        request.getRequestDispatcher("/share.html").forward(request, response);
    }

    @GetMapping("/api/s/{uuid}")
    public ResponseEntity<SharedSnippetResponse> getShared(@PathVariable String uuid) {
        CommentHistory h = commentHistoryRepository.findByShareUuid(uuid).orElseThrow(() -> new ApiException("Not found", 404));
        SharedSnippetResponse resp = SharedSnippetResponse.builder()
            .language(h.getLanguage())
            .outputCode(h.getOutputCode())
            .style(h.getStyle())
            .createdAt(h.getCreatedAt())
            .build();
        return ResponseEntity.ok(resp);
    }
}
