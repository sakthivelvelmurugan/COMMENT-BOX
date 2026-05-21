package com.commentbox.api.util;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ErrorResponse {

    private boolean error;
    private String message;
    private int status;
    private String code;
}
