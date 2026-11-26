package com.example.backend.user;

import com.example.backend.common.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public UserResponse getById(Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    if (!"ACTIVE".equals(user.getStatus())) {
                        throw ApiException.unauthorized("ACCOUNT_INACTIVE", "Tài khoản hiện không hoạt động.");
                    }
                    return UserResponse.from(user);
                })
                .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "Không tìm thấy người dùng."));
    }
}
