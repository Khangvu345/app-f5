package com.example.backend.auth;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

import com.example.backend.auth.dto.AuthResponse;
import com.example.backend.auth.dto.LoginRequest;
import com.example.backend.auth.dto.RegisterRequest;
import com.example.backend.common.ApiException;
import com.example.backend.user.User;
import com.example.backend.user.UserRepository;
import com.example.backend.user.UserResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final OAuthIdentityRepository identities;
    private final OAuthTokenVerifier verifier;
    private final RefreshTokenService refreshTokens;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, TokenService tokenService,
            OAuthIdentityRepository identities, OAuthTokenVerifier verifier, RefreshTokenService refreshTokens) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.identities = identities;
        this.verifier = verifier;
        this.refreshTokens = refreshTokens;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD", "Mật khẩu tối đa 72 byte khi mã hóa UTF-8.");
        }
        String email = normalize(request.email());
        if (userRepository.existsByEmail(email)) {
            throw emailTaken();
        }

        User user = new User(email, passwordEncoder.encode(request.password()), request.fullName().trim());
        try {
            user = userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            // Two concurrent sign-ups with the same email: the unique constraint wins.
            throw emailTaken();
        }
        return toResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailForUpdate(normalize(request.email()))
                .filter(found -> found.getPasswordHash() != null && passwordEncoder.matches(request.password(), found.getPasswordHash()))
                .orElseThrow(() -> ApiException.unauthorized("INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng."));
        return toResponse(user);
    }

    @Transactional
    public AuthResponse oauth(String provider, String idToken, String nonce) {
        Jwt jwt = verifier.verify(provider, idToken, nonce);
        var existing = identities.findByProviderAndSubject(provider, jwt.getSubject());
        if (existing.isPresent()) {
            User user = userRepository.findByIdForUpdate(existing.get().getUser().getId())
                    .orElseThrow(() -> ApiException.unauthorized("ACCOUNT_INACTIVE", "Tài khoản hiện không hoạt động."));
            return toResponse(user);
        }

        // Only a verified email is eligible for storage, never automatic account linking.
        String email = jwt.getClaimAsString("email");
        Object verified = jwt.getClaims().get("email_verified");
        if (email == null || !"true".equalsIgnoreCase(String.valueOf(verified))) {
            email = null;
        }
        if (email != null) {
            email = normalize(email);
            if (email.isBlank() || email.length() > 255) {
                email = null;
            }
        }
        if (email != null && userRepository.existsByEmail(email)) {
            throw oauthEmailTaken();
        }
        String name = jwt.getClaimAsString("name");
        if (name == null || name.isBlank()) {
            name = provider.equals("GOOGLE") ? "Google user" : "Apple user";
        }
        name = name.trim();
        if (name.length() > 100) {
            name = name.substring(0, 100);
        }
        try {
            User user = userRepository.saveAndFlush(new User(email, null, name));
            identities.saveAndFlush(new OAuthIdentity(user, provider, jwt.getSubject()));
            return toResponse(user);
        } catch (DataIntegrityViolationException ex) {
            // Concurrent first logins may race on either the email or provider identity.
            throw ApiException.conflict("OAUTH_SIGN_IN_CONFLICT",
                    "Không thể hoàn tất đăng nhập. Vui lòng thử lại hoặc dùng phương thức đăng nhập ban đầu.");
        }
    }

    @Transactional
    public AuthResponse refresh(String token) {
        return toResponse(refreshTokens.consume(token));
    }

    private AuthResponse toResponse(User user) {
        if (!"ACTIVE".equals(user.getStatus())) {
            throw ApiException.unauthorized("ACCOUNT_INACTIVE", "Tài khoản hiện không hoạt động.");
        }
        String token = tokenService.generateAccessToken(user.getId(), user.getEmail());
        return new AuthResponse(token, refreshTokens.issue(user), "Bearer", tokenService.accessTokenTtlSeconds(), UserResponse.from(user));
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static ApiException oauthEmailTaken() {
        return ApiException.conflict("EMAIL_ALREADY_USED",
                "Email này đã được sử dụng. Vui lòng đăng nhập bằng phương thức ban đầu.");
    }

    private static ApiException emailTaken() {
        return ApiException.conflict("EMAIL_ALREADY_USED", "Email này đã được sử dụng.");
    }
}
