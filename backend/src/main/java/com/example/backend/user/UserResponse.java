package com.example.backend.user;

import java.util.UUID;

/** Public view of a user (never exposes the password hash). Matches the app's `User` type. */
public record UserResponse(UUID id, String email, String fullName) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getFullName());
    }
}
