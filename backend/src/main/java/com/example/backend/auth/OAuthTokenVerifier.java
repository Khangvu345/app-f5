package com.example.backend.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.BiFunction;

import com.example.backend.common.ApiException;
import com.example.backend.config.OAuthProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

@Component
class OAuthTokenVerifier {
    private final OAuthProperties properties;
    private final Map<String, NimbusJwtDecoder> decoders = new ConcurrentHashMap<>();
    private final BiFunction<Boolean, String, NimbusJwtDecoder> decoderFactory;

    @Autowired
    OAuthTokenVerifier(OAuthProperties properties) {
        this(properties, OAuthTokenVerifier::createDecoder);
    }

    OAuthTokenVerifier(OAuthProperties properties, BiFunction<Boolean, String, NimbusJwtDecoder> decoderFactory) {
        this.properties = properties;
        this.decoderFactory = decoderFactory;
    }

    Jwt verify(String provider, String token, String nonce) {
        boolean google = provider.equals("GOOGLE");
        String clientId = google ? properties.googleClientId() : properties.appleClientId();
        if (clientId == null || clientId.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "OAUTH_NOT_CONFIGURED", "Đăng nhập này chưa được cấu hình.");
        }
        NimbusJwtDecoder decoder = decoders.computeIfAbsent(provider, key -> decoderFactory.apply(google, clientId));
        try {
            Jwt jwt = decoder.decode(token);
            if (!google && (nonce == null || nonce.isBlank() || nonce.length() > 512
                    || !MessageDigest.isEqual(sha256(nonce).getBytes(StandardCharsets.US_ASCII),
                    String.valueOf(jwt.getClaimAsString("nonce")).getBytes(StandardCharsets.US_ASCII)))) {
                throw new JwtException("Invalid nonce");
            }
            return jwt;
        } catch (JwtException | IllegalArgumentException ex) {
            throw ApiException.unauthorized("INVALID_ID_TOKEN", "Thông tin đăng nhập không hợp lệ hoặc đã hết hạn.");
        }
    }
    private static NimbusJwtDecoder createDecoder(boolean google, String clientId) {
        String jwkUri = google ? "https://www.googleapis.com/oauth2/v3/certs" : "https://appleid.apple.com/auth/keys";
        return configureDecoder(NimbusJwtDecoder.withJwkSetUri(jwkUri).build(), google, clientId);
    }

    static NimbusJwtDecoder configureDecoder(NimbusJwtDecoder decoder, boolean google, String clientId) {
        OAuth2TokenValidator<Jwt> claims = jwt -> {
            String issuer = jwt.getClaimAsString("iss");
            boolean validIssuer = google
                    ? "https://accounts.google.com".equals(issuer) || "accounts.google.com".equals(issuer)
                    : "https://appleid.apple.com".equals(issuer);
            String subject = jwt.getSubject();
            boolean valid = validIssuer
                    && jwt.getExpiresAt() != null
                    && jwt.getAudience() != null && jwt.getAudience().contains(clientId)
                    && subject != null && !subject.isBlank() && subject.length() <= 255;
            return valid ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
        };
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                new JwtTimestampValidator(Duration.ZERO), claims));
        return decoder;
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
