package com.commentbox.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "user_api_keys", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "provider"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserApiKey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "provider", length = 50, nullable = false)
    private String provider;

    @Column(name = "encrypted_key", columnDefinition = "TEXT", nullable = false)
    private String encryptedKey;

    @Column(name = "key_hint", length = 20)
    private String keyHint;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
