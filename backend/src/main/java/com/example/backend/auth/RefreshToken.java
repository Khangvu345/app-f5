package com.example.backend.auth;

import java.time.Instant;
import com.example.backend.user.User;
import jakarta.persistence.*;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Column(name = "revoked_at")
    private Instant revokedAt;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected RefreshToken() { }

    RefreshToken(User user, String tokenHash, Instant now) {
        this.user = user;
        this.tokenHash = tokenHash;
        this.createdAt = now;
        this.expiresAt = now.plusSeconds(30L * 24 * 60 * 60);
    }

    User getUser() { return user; }
}
