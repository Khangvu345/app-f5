package com.example.backend.auth;

import com.example.backend.common.ApiException;
import com.example.backend.config.OAuthProperties;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Date;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import static org.junit.jupiter.api.Assertions.*;

class OAuthTokenVerifierTest {
    private static KeyPair trusted;
    private static KeyPair untrusted;
    private static OAuthTokenVerifier verifier;

    @BeforeAll
    static void setup() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        trusted = generator.generateKeyPair();
        untrusted = generator.generateKeyPair();
        verifier = new OAuthTokenVerifier(new OAuthProperties("google-client", "apple-client"),
                OAuthTokenVerifierTest::decoder);
    }

    private static NimbusJwtDecoder decoder(boolean google, String audience) {
        return OAuthTokenVerifier.configureDecoder(NimbusJwtDecoder.withPublicKey((RSAPublicKey) trusted.getPublic()).build(), google, audience);
    }

    private static String token(KeyPair key, String issuer, String audience, Instant expiration, String subject, String nonce) throws Exception {
        JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder().issuer(issuer).audience(audience).subject(subject);
        if (expiration != null) claims.expirationTime(Date.from(expiration));
        if (nonce != null) claims.claim("nonce", nonce);
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims.build());
        jwt.sign(new RSASSASigner(key.getPrivate()));
        return jwt.serialize();
    }

    @Test
    void verifiesSignatureIssuerAudienceExpiryAndSubject() throws Exception {
        Instant future = Instant.now().plusSeconds(300);
        assertEquals("sub", verifier.verify("GOOGLE", token(trusted, "https://accounts.google.com", "google-client", future, "sub", null), null).getSubject());
        for (String invalid : new String[] {
                token(untrusted, "https://accounts.google.com", "google-client", future, "sub", null),
                token(trusted, "https://evil.example", "google-client", future, "sub", null),
                token(trusted, "https://accounts.google.com", "wrong-client", future, "sub", null),
                token(trusted, "https://accounts.google.com", "google-client", Instant.now().minusSeconds(1), "sub", null),
                token(trusted, "https://accounts.google.com", "google-client", null, "sub", null),
                token(trusted, "https://accounts.google.com", "google-client", future, "", null) }) {
            assertThrows(ApiException.class, () -> verifier.verify("GOOGLE", invalid, null));
        }
    }

    @Test
    void appleRequiresMatchingHashedNonce() throws Exception {
        String signed = token(trusted, "https://appleid.apple.com", "apple-client", Instant.now().plusSeconds(300), "sub",
                "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
        assertEquals("sub", verifier.verify("APPLE", signed, "abc").getSubject());
        assertThrows(ApiException.class, () -> verifier.verify("APPLE", signed, "wrong"));
        assertThrows(ApiException.class, () -> verifier.verify("APPLE", signed, null));
    }
}
