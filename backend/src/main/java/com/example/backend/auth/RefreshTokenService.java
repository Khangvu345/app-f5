package com.example.backend.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import com.example.backend.common.ApiException;
import com.example.backend.user.User;
import com.example.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshTokenService {
    private final RefreshTokenRepository tokens;
    private final UserRepository users;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository tokens, UserRepository users) { this.tokens = tokens; this.users = users; }

    public String issue(User user) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String value = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.save(new RefreshToken(user, hash(value), Instant.now()));
        return value;
    }

    public User consume(String value) {
        String hash = hash(value);
        RefreshToken existing = tokens.findByTokenHash(hash).orElseThrow(RefreshTokenService::invalidToken);
        User user = users.findByIdForUpdate(existing.getUser().getId()).orElseThrow(RefreshTokenService::invalidToken);
        if (tokens.consume(hash, Instant.now()) != 1) {
            throw invalidToken();
        }
        return user;
    }

    @Transactional
    public void revokeForUser(Long userId, String value) {
        if (value != null && !value.isBlank()) tokens.revokeForUser(hash(value), userId, Instant.now());
    }

    @Transactional
    public void revokeAllForUser(Long userId) {
        tokens.revokeAllByUserId(userId, Instant.now());
    }

    private static ApiException invalidToken() {
        return ApiException.unauthorized("INVALID_REFRESH_TOKEN", "Phiên đăng nhập đã hết hạn hoặc không hợp lệ.");
    }

    static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
