package com.commentbox.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "comment_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "language", length = 20, nullable = false)
    private String language;

    @Column(name = "style", length = 20, nullable = false)
    private String style;

    @Column(name = "density", length = 20, nullable = false)
    private String density;

    @Column(name = "input_code", columnDefinition = "TEXT", nullable = false)
    private String inputCode;

    @Column(name = "output_code", columnDefinition = "TEXT", nullable = false)
    private String outputCode;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "share_uuid", length = 36, unique = true)
    private String shareUuid;

    @Builder.Default
    @Column(name = "is_shared")
    private Boolean isShared = false;
}
