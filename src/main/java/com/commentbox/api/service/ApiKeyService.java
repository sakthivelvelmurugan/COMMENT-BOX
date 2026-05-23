package com.commentbox.api.service;

import com.commentbox.api.model.ApiKeyResponse;
import com.commentbox.api.model.SaveKeyRequest;
import com.commentbox.api.model.User;
import com.commentbox.api.model.UserApiKey;
import com.commentbox.api.repository.UserApiKeyRepository;
import com.commentbox.api.repository.UserRepository;
import com.commentbox.api.util.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ApiKeyService {

    private final UserApiKeyRepository userApiKeyRepository;
    private final UserRepository userRepository;
    private final EncryptionService encryptionService;

    @Transactional
    public ApiKeyResponse saveKey(String email, SaveKeyRequest request) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new ApiException("User not found"));
        String encrypted = encryptionService.encrypt(request.getApiKey());
        String last4 = request.getApiKey().length() >= 4 ? request.getApiKey().substring(request.getApiKey().length() - 4) : request.getApiKey();
        String hint = "••••" + last4;

        Optional<UserApiKey> existing = userApiKeyRepository.findByUserAndProvider(user, request.getProvider());
        UserApiKey saved;
        if (existing.isPresent()) {
            UserApiKey e = existing.get();
            e.setEncryptedKey(encrypted);
            e.setKeyHint(hint);
            e.setIsActive(true);
            saved = userApiKeyRepository.save(e);
        } else {
            UserApiKey newRec = UserApiKey.builder()
                    .user(user)
                    .provider(request.getProvider())
                    .encryptedKey(encrypted)
                    .keyHint(hint)
                    .isActive(true)
                    .build();
            if (newRec != null) {
                saved = userApiKeyRepository.save(newRec);
            } else {
                throw new ApiException("Failed to create API key", 500);
            }
        }

        return ApiKeyResponse.builder()
                .provider(saved.getProvider())
                .keyHint(saved.getKeyHint())
                .isActive(saved.getIsActive())
                .hasKey(true)
                .build();
    }

    @Transactional(readOnly = true)
    public String resolveKey(String email, String provider) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new ApiException("User not found"));
        Optional<UserApiKey> opt = userApiKeyRepository.findByUserAndProviderAndIsActive(user, provider, true);
        if (opt.isEmpty()) throw new ApiException("No active API key found");
        return encryptionService.decrypt(opt.get().getEncryptedKey());
    }

    @Transactional(readOnly = true)
    public ApiKeyResponse getKeyInfo(String email, String provider) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new ApiException("User not found"));
        Optional<UserApiKey> opt = userApiKeyRepository.findByUserAndProvider(user, provider);
        if (opt.isEmpty()) {
            return ApiKeyResponse.builder().provider(provider).hasKey(false).isActive(false).build();
        }
        UserApiKey u = opt.get();
        return ApiKeyResponse.builder()
                .provider(provider)
                .keyHint(u.getKeyHint())
                .isActive(u.getIsActive())
                .hasKey(true)
                .build();
    }

    @Transactional
    public void deleteKey(String email, String provider) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new ApiException("User not found"));
        Optional<UserApiKey> opt = userApiKeyRepository.findByUserAndProvider(user, provider);
        opt.ifPresent(userApiKeyRepository::delete);
    }

    @Transactional(readOnly = true)
    public boolean hasActiveKey(String email, String provider) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new ApiException("User not found"));
        return userApiKeyRepository.findByUserAndProviderAndIsActive(user, provider, true).isPresent();
    }
}
