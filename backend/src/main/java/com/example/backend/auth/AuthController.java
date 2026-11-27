package com.example.backend.auth;

import java.util.Locale;

import com.example.backend.auth.dto.AuthResponse;
import com.example.backend.auth.dto.LoginRequest;
import com.example.backend.auth.dto.OAuthRequest;
import com.example.backend.auth.dto.RegisterRequest;
import com.example.backend.auth.dto.RefreshTokenRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import com.example.backend.common.ApiException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenService refreshTokens;

    public AuthController(AuthService authService, RefreshTokenService refreshTokens) {
        this.authService = authService;
        this.refreshTokens = refreshTokens;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return authService.refresh(request.refreshToken());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody(required = false) RefreshTokenRequest request) {
        if (request != null) refreshTokens.revokeForUser(Long.parseLong(jwt.getSubject()), request.refreshToken());
    }

    @PostMapping("/oauth/{provider}")
    public AuthResponse oauth(@PathVariable String provider, @Valid @RequestBody OAuthRequest request) {
        String normalized = provider.toUpperCase(Locale.ROOT);
        if (!normalized.equals("GOOGLE") && !normalized.equals("APPLE")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OAUTH_PROVIDER_NOT_FOUND",
                    "Phương thức đăng nhập không được hỗ trợ.");
        }
        return authService.oauth(normalized, request.idToken(), request.nonce());
    }
}
