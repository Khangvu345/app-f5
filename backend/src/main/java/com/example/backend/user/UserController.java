package com.example.backend.user;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    private final UserService userService;
    public UserController(UserService userService) { this.userService = userService; }
    private static Long id(Jwt jwt) { return Long.parseLong(jwt.getSubject()); }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal Jwt jwt) { return userService.getById(id(jwt)); }

    @PatchMapping("/me")
    public UserResponse update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateRequest request) {
        return userService.update(id(jwt), request.displayName());
    }

    @GetMapping("/me/settings")
    public UserSettings settings(@AuthenticationPrincipal Jwt jwt) { return userService.settings(id(jwt)); }

    @GetMapping("/me/export")
    public AccountExport export(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "json") String format) {
        return userService.export(id(jwt), format);
    }

    @PatchMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PasswordRequest request) {
        userService.changePassword(id(jwt), request.currentPassword(), request.newPassword());
    }

    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody DeleteRequest request) {
        userService.delete(id(jwt), request.password(), request.deletionSecret());
    }

    @PostMapping("/deletion-status")
    public DeletionStatus deletionStatus(@Valid @RequestBody StatusRequest request) {
        return new DeletionStatus(userService.deletionCompleted(request.deletionSecret()));
    }

    public record UpdateRequest(@NotBlank @Size(max = 100) String displayName) {}
    public record PasswordRequest(@NotBlank String currentPassword, @NotBlank @Size(min = 8, max = 72) String newPassword) {}
    public record DeleteRequest(@NotBlank String password, @NotBlank @Pattern(regexp = "[0-9a-f]{64}") String deletionSecret) {}
    public record StatusRequest(@NotBlank @Pattern(regexp = "[0-9a-f]{64}") String deletionSecret) {}
    public record DeletionStatus(boolean deleted) {}
}
