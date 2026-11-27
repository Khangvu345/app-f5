package com.example.backend.user;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.Optional;
import com.example.backend.auth.RefreshTokenService;
import com.example.backend.common.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

class UserServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private final RefreshTokenService tokens = mock(RefreshTokenService.class);
    private final DeletionReceiptRepository receipts = mock(DeletionReceiptRepository.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final UserService service = new UserService(users, passwords, tokens, receipts, jdbc);
    private User user;
    private final String secret = "a".repeat(64);

    @BeforeEach void setup() {
        user = new User("a@example.com", "hash", "Alice");
        ReflectionTestUtils.setField(user, "id", 1L);
        when(users.findById(1L)).thenReturn(Optional.of(user));
        when(users.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
    }

    @Test void wrongPasswordDoesNotDeleteOrRevoke() {
        assertThatThrownBy(() -> service.delete(1L, "bad", secret))
            .isInstanceOfSatisfying(ApiException.class, e -> {
                assertThat(e.getCode()).isEqualTo("WRONG_PASSWORD");
                assertThat(e.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
            });
        verifyNoInteractions(receipts, tokens, jdbc);
        assertThat(user.getStatus()).isEqualTo("ACTIVE");
    }

    @Test void successfulDeleteRemovesIdentityAndWritesReceiptWithoutSecret() {
        when(passwords.matches("good", "hash")).thenReturn(true);
        service.delete(1L, "good", secret);
        verify(receipts).save(argThat(receipt -> !secret.equals(ReflectionTestUtils.getField(receipt, "secretHash"))));
        verify(tokens).revokeAllForUser(1L);
        verify(jdbc).update("DELETE FROM oauth_identities WHERE user_id = ?", 1L);
        assertThat(user.getStatus()).isEqualTo("DELETED");
        assertThat(user.getEmail()).isNull();
        assertThat(user.getPasswordHash()).isNull();
        assertThat(user.getFullName()).isEqualTo("Deleted account");
    }

    @Test void oauthOnlyAccountCannotUsePasswordOperations() {
        user.setPasswordHash(null);
        assertThat(UserResponse.from(user).canDeleteWithPassword()).isFalse();
        assertThatThrownBy(() -> service.delete(1L, "anything", secret))
            .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getCode()).isEqualTo("PASSWORD_NOT_AVAILABLE"));
        verifyNoInteractions(receipts, tokens, jdbc);
    }

    @Test void passwordChangeRevokesRefreshTokensAndWrongPasswordIsBadRequest() {
        assertThatThrownBy(() -> service.changePassword(1L, "bad", "newpassword"))
            .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verifyNoInteractions(tokens);
        when(passwords.matches("good", "hash")).thenReturn(true);
        when(passwords.encode("newpassword")).thenReturn("newhash");
        service.changePassword(1L, "good", "newpassword");
        assertThat(user.getPasswordHash()).isEqualTo("newhash");
        verify(tokens).revokeAllForUser(1L);
    }

    @Test void exportContainsOnlyAccountFields() {
        AccountExport result = service.export(1L, "json");
        assertThat(result.user().displayName()).isEqualTo("Alice");
        assertThat(result.settings().planType()).isEqualTo("FREE");
        assertThat(result.exportedAt()).isNotNull();
        assertThatThrownBy(() -> service.export(1L, "pdf"))
            .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getCode()).isEqualTo("EXPORT_FORMAT_NOT_SUPPORTED"));
    }
}
