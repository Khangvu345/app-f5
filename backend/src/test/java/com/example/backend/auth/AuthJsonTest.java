package com.example.backend.auth;

import com.example.backend.auth.dto.RegisterRequest;
import com.example.backend.user.User;
import com.example.backend.user.UserResponse;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthJsonTest {
    private final JsonMapper mapper = JsonMapper.builder().build();

    @Test
    void largeIdIsSerializedAsExactDecimalString() {
        User user = mock(User.class);
        when(user.getId()).thenReturn(9007199254740993L);
        when(user.getFullName()).thenReturn("Test");
        when(user.getPlanType()).thenReturn("PREMIUM");
        var json = mapper.readTree(mapper.writeValueAsString(UserResponse.from(user)));
        assertTrue(json.get("id").isString());
        assertEquals("9007199254740993", json.get("id").asString());
        assertEquals("Test", json.get("displayName").asString());
        assertEquals("PREMIUM", json.get("planType").asString());
    }

    @Test
    void acceptsCurrentAndLegacyRegistrationNames() {
        assertEquals("Current", mapper.readValue("{\"displayName\":\"Current\"}", RegisterRequest.class).fullName());
        assertEquals("Legacy", mapper.readValue("{\"fullName\":\"Legacy\"}", RegisterRequest.class).fullName());
    }
}
