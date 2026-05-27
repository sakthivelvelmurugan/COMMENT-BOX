package com.commentbox.api.config;

import com.commentbox.api.model.User;
import com.commentbox.api.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DatabaseInitializer {

    @Bean
    public CommandLineRunner initDatabase(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.findByEmail("guest@commentbox.com").isEmpty()) {
                User guest = User.builder()
                        .email("guest@commentbox.com")
                        .passwordHash(passwordEncoder.encode("guest"))
                        .role("USER")
                        .build();
                userRepository.save(guest);
            }
        };
    }
}
