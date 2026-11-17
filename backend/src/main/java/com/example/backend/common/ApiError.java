package com.example.backend.common;

import java.time.Instant;
import java.util.Map;

/** Error body returned to clients. The mobile app reads `message` and `code`. */
public record ApiError(
        Instant timestamp,
        int status,
        String code,
        String message,
        Map<String, String> fieldErrors) {

    public static ApiError of(int status, String code, String message) {
        return new ApiError(Instant.now(), status, code, message, Map.of());
    }

    public static ApiError of(int status, String code, String message, Map<String, String> fieldErrors) {
        return new ApiError(Instant.now(), status, code, message, fieldErrors);
    }
}
