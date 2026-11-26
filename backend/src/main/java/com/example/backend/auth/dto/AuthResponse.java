package com.example.backend.auth.dto;

import com.example.backend.user.UserResponse;

public record AuthResponse(String accessToken, String tokenType, long expiresIn, UserResponse user) { }
