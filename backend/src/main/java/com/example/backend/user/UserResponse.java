package com.example.backend.user;

/** Public account details; IDs are strings to preserve precision on mobile. */
public record UserResponse(String id, String email, String displayName, String role, String status, String planType, boolean canDeleteWithPassword) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId().toString(), user.getEmail(), user.getFullName(),
                user.getRole(), user.getStatus(), user.getPlanType(), user.getPasswordHash() != null);
    }
}
