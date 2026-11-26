package com.example.backend.auth;

import com.example.backend.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "oauth_identities")
class OAuthIdentity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 10)
    private String provider;

    @Column(nullable = false, length = 255)
    private String subject;

    protected OAuthIdentity() {
    }

    OAuthIdentity(User user, String provider, String subject) {
        this.user = user;
        this.provider = provider;
        this.subject = subject;
    }

    User getUser() {
        return user;
    }
}
