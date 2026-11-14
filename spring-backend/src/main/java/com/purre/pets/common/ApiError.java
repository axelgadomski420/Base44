package com.purre.pets.common;

import lombok.Value;

import java.time.Instant;
import java.util.Map;

@Value
public class ApiError {
    String code;
    String message;
    Map<String, Object> details;
    Instant timestamp;
    String path;

    public static ApiError of(String code, String message, Map<String, Object> details, String path) {
        return new ApiError(code, message, details, Instant.now(), path);
    }
}