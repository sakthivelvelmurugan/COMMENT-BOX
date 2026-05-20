package com.commentbox.api.repository;

import com.commentbox.api.model.User;
import com.commentbox.api.model.UserApiKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserApiKeyRepository extends JpaRepository<UserApiKey, Long> {
    Optional<UserApiKey> findByUserAndProvider(User user, String provider);
    Optional<UserApiKey> findByUserAndProviderAndIsActive(User user, String provider, Boolean isActive);
    List<UserApiKey> findAllByUser(User user);
}
