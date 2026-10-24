package com.example.backend.auth.dto;

import com.example.backend.user.UserResponse;

/** Matches the app's `AuthResponse` type. */
public record AuthResponse(String accessToken, UserResponse user) {
}
