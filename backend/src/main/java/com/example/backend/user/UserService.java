package com.example.backend.user;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;

import com.example.backend.auth.RefreshTokenService;
import com.example.backend.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final RefreshTokenService refreshTokens;
    private final DeletionReceiptRepository receipts;
    private final JdbcTemplate jdbc;

    public UserService(UserRepository users, PasswordEncoder passwords, RefreshTokenService refreshTokens,
            DeletionReceiptRepository receipts, JdbcTemplate jdbc) {
        this.users = users;
        this.passwords = passwords;
        this.refreshTokens = refreshTokens;
        this.receipts = receipts;
        this.jdbc = jdbc;
    }

    private User active(Long id) {
        User user = users.findById(id).orElseThrow(() ->
                ApiException.unauthorized("ACCOUNT_INACTIVE", "Tài khoản hiện không hoạt động."));
        if (!"ACTIVE".equals(user.getStatus())) {
            throw ApiException.unauthorized("ACCOUNT_INACTIVE", "Tài khoản hiện không hoạt động.");
        }
        return user;
    }

    private User activeForUpdate(Long id) {
        User user = users.findByIdForUpdate(id).orElseThrow(() ->
                ApiException.unauthorized("ACCOUNT_INACTIVE", "Tài khoản hiện không hoạt động."));
        if (!"ACTIVE".equals(user.getStatus())) {
            throw ApiException.unauthorized("ACCOUNT_INACTIVE", "Tài khoản hiện không hoạt động.");
        }
        return user;
    }

    @Transactional(readOnly = true)
    public UserResponse getById(Long id) { return UserResponse.from(active(id)); }

    @Transactional
    public UserResponse update(Long id, String displayName) {
        User user = activeForUpdate(id);
        user.setFullName(displayName.trim());
        return UserResponse.from(user);
    }

    @Transactional(readOnly = true)
    public UserSettings settings(Long id) { return UserSettings.from(active(id)); }

    @Transactional(readOnly = true)
    public AccountExport export(Long id, String format) {
        if (!"json".equalsIgnoreCase(format)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "EXPORT_FORMAT_NOT_SUPPORTED", "Chỉ hỗ trợ xuất JSON.");
        }
        User user = active(id);
        return new AccountExport(UserResponse.from(user), UserSettings.from(user), Instant.now());
    }

    @Transactional
    public void changePassword(Long id, String currentPassword, String newPassword) {
        User user = activeForUpdate(id);
        verifyPassword(user, currentPassword, HttpStatus.BAD_REQUEST);
        if (newPassword.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD", "Mật khẩu tối đa 72 byte khi mã hóa UTF-8.");
        }
        user.setPasswordHash(passwords.encode(newPassword));
        refreshTokens.revokeAllForUser(id);
    }

    @Transactional
    public void delete(Long id, String password, String secret) {
        User user = activeForUpdate(id);
        verifyPassword(user, password, HttpStatus.UNAUTHORIZED);
        receipts.save(new DeletionReceipt(hash(secret)));
        refreshTokens.revokeAllForUser(id);
        jdbc.update("DELETE FROM oauth_identities WHERE user_id = ?", id);
        user.deleteAccount();
        users.flush();
    }

    @Transactional(readOnly = true)
    public boolean deletionCompleted(String secret) { return receipts.existsById(hash(secret)); }

    private void verifyPassword(User user, String password, HttpStatus wrongPasswordStatus) {
        if (user.getPasswordHash() == null) {
            throw ApiException.conflict("PASSWORD_NOT_AVAILABLE", "Tài khoản này chưa hỗ trợ xác nhận bằng mật khẩu.");
        }
        if (!passwords.matches(password, user.getPasswordHash())) {
            throw new ApiException(wrongPasswordStatus, "WRONG_PASSWORD", "Mật khẩu hiện tại không đúng.");
        }
    }

    private static String hash(String secret) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.US_ASCII)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
