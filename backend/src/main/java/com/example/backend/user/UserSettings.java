package com.example.backend.user;

public record UserSettings(String displayName, String planType) {
    static UserSettings from(User user) { return new UserSettings(user.getFullName(), user.getPlanType()); }
}
