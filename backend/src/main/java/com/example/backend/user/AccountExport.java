package com.example.backend.user;

import java.time.Instant;

public record AccountExport(UserResponse user, UserSettings settings, Instant exportedAt) {}
