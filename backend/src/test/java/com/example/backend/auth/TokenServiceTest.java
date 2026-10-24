package com.example.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import com.example.backend.config.JwtProperties;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

class TokenServiceTest {

    @Test
    void generatedTokenCanBeDecodedAndCarriesUserClaims() {
        JwtProperties properties = new JwtProperties(
                "0123456789abcdef0123456789abcdef", "test-issuer", Duration.ofMinutes(5));
        SecretKey key = new SecretKeySpec(properties.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        TokenService service = new TokenService(new NimbusJwtEncoder(new ImmutableSecret<>(key)), properties);

        UUID userId = UUID.randomUUID();
        String token = service.generateAccessToken(userId, "user@example.com");

        Jwt jwt = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build().decode(token);
        assertEquals(userId.toString(), jwt.getSubject());
        assertEquals("user@example.com", jwt.getClaimAsString("email"));
        assertEquals("test-issuer", jwt.getClaimAsString("iss"));
    }
}
