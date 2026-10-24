package com.example.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Vui lòng nhập họ và tên.")
        @Size(max = 100, message = "Họ và tên tối đa 100 ký tự.")
        String fullName,

        @NotBlank(message = "Vui lòng nhập email.")
        @Email(message = "Email không hợp lệ.")
        @Size(max = 255, message = "Email tối đa 255 ký tự.")
        String email,

        // BCrypt only uses the first 72 bytes, hence the upper bound.
        @NotBlank(message = "Vui lòng nhập mật khẩu.")
        @Size(min = 8, max = 72, message = "Mật khẩu phải từ 8 đến 72 ký tự.")
        String password) {
}
