package com.commentbox.api.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponse {

    private String outputCode;
    private String language;
    private int generatesRemaining;
    private boolean byokActive;
    private String provider;
}
