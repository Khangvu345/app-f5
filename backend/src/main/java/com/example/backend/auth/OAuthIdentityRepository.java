package com.example.backend.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface OAuthIdentityRepository extends JpaRepository<OAuthIdentity, Long> {
    Optional<OAuthIdentity> findByProviderAndSubject(String provider, String subject);
}
