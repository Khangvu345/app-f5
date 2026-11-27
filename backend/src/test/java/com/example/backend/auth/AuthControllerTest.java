package com.example.backend.auth;

import com.example.backend.auth.dto.AuthResponse;
import com.example.backend.auth.dto.RegisterRequest;
import com.example.backend.common.GlobalExceptionHandler;
import com.example.backend.user.UserResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthControllerTest {

    private AuthService service;
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        service = mock(AuthService.class);
        mvc = MockMvcBuilders.standaloneSetup(new AuthController(service, mock(RefreshTokenService.class)))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void registerAcceptsLegacyAndCurrentNameAndPreservesLargeIdInHttpJson() throws Exception {
        when(service.register(any())).thenReturn(new AuthResponse("token", "refresh", "Bearer", 3600,
                new UserResponse("9007199254740993", "user@example.com", "Example", "USER", "ACTIVE", "FREE", true)));
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"displayName":"Example","email":"user@example.com","password":"password"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.id", is("9007199254740993")))
                .andExpect(jsonPath("$.user.displayName", is("Example")))
                .andExpect(jsonPath("$.user.planType", is("FREE")));
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Legacy","email":"user@example.com","password":"password"}
                                """))
                .andExpect(status().isCreated());
        verify(service).register(new RegisterRequest("Legacy", "user@example.com", "password"));
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"","email":"user@example.com","password":"password"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void canonicalOauthRouteRejectsUnknownProviderAndValidatesToken() throws Exception {
        mvc.perform(post("/api/v1/auth/oauth/unknown").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"token\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("OAUTH_PROVIDER_NOT_FOUND")));
        mvc.perform(post("/api/v1/auth/oauth/google").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"\"}"))
                .andExpect(status().isBadRequest());
        when(service.oauth("GOOGLE", "token", null)).thenReturn(new AuthResponse("access", "refresh", "Bearer", 3600,
                new UserResponse("1", null, "Example", "USER", "ACTIVE", "FREE", true)));
        mvc.perform(post("/api/v1/auth/oauth/google").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", is("access")));
    }
}
