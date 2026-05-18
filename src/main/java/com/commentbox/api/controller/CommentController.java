package com.commentbox.api.controller;

import com.commentbox.api.model.CommentRequest;
import com.commentbox.api.model.CommentResponse;
import com.commentbox.api.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @PostMapping("/generate")
    public ResponseEntity<CommentResponse> generate(@Valid @RequestBody CommentRequest request) {
        CommentResponse response = commentService.generateComment(request);
        return ResponseEntity.ok(response);
    }
}
