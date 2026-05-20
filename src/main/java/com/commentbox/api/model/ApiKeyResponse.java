package com.commentbox.api.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiKeyResponse {
    private String provider;
    private String keyHint;
    private Boolean isActive;
    @Builder.Default
    private Boolean hasKey = true;
}
