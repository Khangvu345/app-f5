package com.example.backend.auth;

import com.example.backend.auth.dto.LoginRequest;
import com.example.backend.auth.dto.RegisterRequest;
import com.example.backend.common.ApiException;
import com.example.backend.user.User;
import com.example.backend.user.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private final TokenService tokens = mock(TokenService.class);
    private final OAuthIdentityRepository identities = mock(OAuthIdentityRepository.class);
    private final OAuthTokenVerifier verifier = mock(OAuthTokenVerifier.class);
    private final AuthService service = new AuthService(users, passwords, tokens, identities, verifier, mock(RefreshTokenService.class));

    @Test
    void oauthOnlyAccountCannotUseEmailPasswordLogin() {
        when(users.findByEmailForUpdate("test@example.com")).thenReturn(Optional.of(new User("test@example.com", null, "Test")));
        ApiException error = assertThrows(ApiException.class, () -> service.login(new LoginRequest("test@example.com", "password")));
        assertEquals("INVALID_CREDENTIALS", error.getCode());
        verifyNoInteractions(passwords);
    }

    @Test
    void verifiedEmailCollisionRequiresOriginalLogin() {
        Jwt jwt = Jwt.withTokenValue("token").header("alg", "RS256").subject("provider-subject")
                .claim("email", "TEST@example.com").claim("email_verified", true).build();
        when(verifier.verify("GOOGLE", "token", null)).thenReturn(jwt);
        when(users.existsByEmail("test@example.com")).thenReturn(true);
        ApiException error = assertThrows(ApiException.class, () -> service.oauth("GOOGLE", "token", null));
        assertEquals("EMAIL_ALREADY_USED", error.getCode());
        assertTrue(error.getMessage().contains("phương thức ban đầu"));
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void rejectsPasswordLongerThanBcryptByteLimit() {
        ApiException error = assertThrows(ApiException.class,
                () -> service.register(new RegisterRequest("Test", "test@example.com", "á".repeat(37))));
        assertEquals("INVALID_PASSWORD", error.getCode());
    }
}
