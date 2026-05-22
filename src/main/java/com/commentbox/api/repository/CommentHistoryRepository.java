package com.commentbox.api.repository;

import com.commentbox.api.model.CommentHistory;
import com.commentbox.api.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CommentHistoryRepository extends JpaRepository<CommentHistory, Long> {
    Page<CommentHistory> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);
    Optional<CommentHistory> findByIdAndUser(Long id, User user);
    long countByUser(User user);
    void deleteByIdAndUser(Long id, User user);
    void deleteAllByUser(User user);
    long countByUserAndCreatedAtAfter(User user, LocalDateTime after);

    @Query("SELECT h.language, COUNT(h) FROM CommentHistory h WHERE h.user = :user GROUP BY h.language")
    List<Object[]> findLanguageCountsByUser(@Param("user") User user);
    Optional<CommentHistory> findByShareUuid(String uuid);
}
