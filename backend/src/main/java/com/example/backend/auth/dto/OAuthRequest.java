package com.example.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record OAuthRequest(@NotBlank(message = "Vui lòng cung cấp ID token.") String idToken, String nonce) { }
