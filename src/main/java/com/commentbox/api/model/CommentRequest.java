package com.commentbox.api.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentRequest {

    @NotBlank
    @Pattern(regexp = "^(java|python|cpp)$", message = "Unsupported language")
    private String language;

    @NotBlank
    @Pattern(regexp = "^(inline|block|jsdoc)$", message = "Unsupported style")
    private String style;

    @NotBlank
    @Pattern(regexp = "^(normal|verbose|minimal)$", message = "Unsupported density")
    private String density;

    @NotBlank
    @Size(max = 50000, message = "Code too large")
    private String code;

    private String apiKey;
}
