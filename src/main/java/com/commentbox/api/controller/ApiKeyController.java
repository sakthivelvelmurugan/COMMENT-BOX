package com.commentbox.api.controller;

import com.commentbox.api.model.ApiKeyResponse;
import com.commentbox.api.model.SaveKeyRequest;
import com.commentbox.api.service.ApiKeyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/keys")
@RequiredArgsConstructor
public class ApiKeyController {

    private final ApiKeyService apiKeyService;

    @PostMapping
    public ResponseEntity<ApiKeyResponse> saveKey(@AuthenticationPrincipal UserDetails user,
                                                  @Validated @RequestBody SaveKeyRequest request) {
        ApiKeyResponse resp = apiKeyService.saveKey(user.getUsername(), request);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/{provider}")
    public ResponseEntity<ApiKeyResponse> getKey(@AuthenticationPrincipal UserDetails user,
                                                 @PathVariable String provider) {
        ApiKeyResponse resp = apiKeyService.getKeyInfo(user.getUsername(), provider);
        return ResponseEntity.ok(resp);
    }

    @DeleteMapping("/{provider}")
    public ResponseEntity<Void> deleteKey(@AuthenticationPrincipal UserDetails user,
                                          @PathVariable String provider) {
        apiKeyService.deleteKey(user.getUsername(), provider);
        return ResponseEntity.noContent().build();
    }
}
