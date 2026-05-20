package com.commentbox.api.util;

public class ApiException extends RuntimeException {

    private final int status;

    public ApiException(String message) {
        this(message, 400);
    }

    public ApiException(String message, Throwable cause) {
        super(message, cause);
        this.status = 500;
    }

    public ApiException(String message, int status) {
        super(message);
        this.status = status;
    }

    public int getStatus() {
        return status;
    }
}
