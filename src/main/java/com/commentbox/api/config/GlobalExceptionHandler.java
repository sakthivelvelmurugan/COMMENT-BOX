package com.commentbox.api.config;

import com.commentbox.api.util.ApiException;
import com.commentbox.api.util.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.util.Set;
import com.commentbox.api.util.LimitExceededException;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage())
            .collect(Collectors.joining("; "));

        return buildErrorResponse(message.isEmpty() ? "Invalid request payload" : message, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        Set<ConstraintViolation<?>> violations = ex.getConstraintViolations();
        String message = violations.stream().map(v -> v.getPropertyPath() + ": " + v.getMessage()).collect(Collectors.joining("; "));
        return buildErrorResponse(message.isEmpty() ? "Invalid request payload" : message, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException ex) {
        int status = ex.getStatus();
        HttpStatus http = HttpStatus.resolve(status);
        if (http == null) http = HttpStatus.BAD_REQUEST;
        return buildErrorResponse(ex.getMessage(), http);
    }

    @ExceptionHandler(LimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleLimitExceeded(LimitExceededException ex) {
        ErrorResponse body = ErrorResponse.builder()
            .error(true)
            .message(ex.getMessage())
            .status(429)
            .code("LIMIT_EXCEEDED")
            .build();
        return ResponseEntity.status(429).body(body);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException ex) {
        log.error("Unhandled server exception", ex);
        return buildErrorResponse("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private ResponseEntity<ErrorResponse> buildErrorResponse(String message, HttpStatus status) {
        return ResponseEntity.status(status).body(
            ErrorResponse.builder()
                .error(true)
                .message(message)
                .status(status.value())
                .build()
        );
    }
}
