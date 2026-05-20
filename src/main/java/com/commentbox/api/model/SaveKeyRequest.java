package com.commentbox.api.model;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaveKeyRequest {
    @NotBlank
    private String provider;
    @NotBlank
    private String apiKey;
}
