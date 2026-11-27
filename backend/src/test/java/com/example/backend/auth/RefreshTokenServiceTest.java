package com.example.backend.auth;

import com.example.backend.common.ApiException;
import com.example.backend.user.User;
import com.example.backend.user.UserRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RefreshTokenServiceTest {
    private final RefreshTokenRepository repository = mock(RefreshTokenRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final RefreshTokenService service = new RefreshTokenService(repository, users);

    @Test
    void issuesRandomOpaqueTokensAndStoresOnlyTheirHashes() throws Exception {
        User user = mock(User.class);
        String first = service.issue(user);
        String second = service.issue(user);
        assertNotEquals(first, second);
        var capture = ArgumentCaptor.forClass(RefreshToken.class);
        verify(repository, times(2)).save(capture.capture());
        var field = RefreshToken.class.getDeclaredField("tokenHash");
        field.setAccessible(true);
        assertEquals(RefreshTokenService.hash(first), field.get(capture.getAllValues().get(0)));
        assertNotEquals(first, field.get(capture.getAllValues().get(0)));
    }

    @Test
    void consumesOnlyOnceAndRejectsInvalidOrExpiredTokens() {
        String hash = RefreshTokenService.hash("opaque");
        User user = mock(User.class);
        RefreshToken token = new RefreshToken(user, hash, Instant.now());
        when(user.getId()).thenReturn(7L);
        when(users.findByIdForUpdate(7L)).thenReturn(Optional.of(user));
        when(repository.consume(eq(hash), any())).thenReturn(1, 0);
        when(repository.findByTokenHash(hash)).thenReturn(Optional.of(token));
        assertSame(user, service.consume("opaque"));
        ApiException error = assertThrows(ApiException.class, () -> service.consume("opaque"));
        assertEquals("INVALID_REFRESH_TOKEN", error.getCode());
        verify(repository, times(2)).findByTokenHash(hash);
    }

    @Test
    void logoutScopesRevocationToTheAuthenticatedUser() {
        service.revokeForUser(7L, "opaque");
        verify(repository).revokeForUser(eq(RefreshTokenService.hash("opaque")), eq(7L), any());
        service.revokeForUser(7L, null);
        verifyNoMoreInteractions(repository);
    }
}
