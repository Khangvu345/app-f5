package com.example.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Phục vụ file contract OpenAPI tĩnh cho Swagger UI.
 *
 * <p>File {@code GiftMate_API_Contract_v1.yaml} đặt ở
 * {@code src/main/resources/openapi/} được phục vụ tại
 * {@code /openapi/GiftMate_API_Contract_v1.yaml}. Swagger UI đọc đúng file này
 * (cấu hình springdoc.swagger-ui.url trong application.yaml) — 1 nguồn sự thật
 * duy nhất, springdoc không tự sinh spec từ code.
 */
@Configuration
public class OpenApiConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/openapi/**")
                .addResourceLocations("classpath:/openapi/");
    }
}
