package com.commentbox.api.service;

import com.commentbox.api.model.User;
import com.commentbox.api.repository.UserRepository;
import com.commentbox.api.util.LimitExceededException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class UsageLimitService {

    public static final int FREE_DAILY_LIMIT = 5;

    private final UserRepository userRepository;

    public int checkAndIncrement(User user) {
        LocalDate today = LocalDate.now();
        if (user.getLastResetDate() == null || user.getLastResetDate().isBefore(today)) {
            user.setDailyGenerateCount(0);
            user.setLastResetDate(today);
        }
        if (user.getDailyGenerateCount() != null && user.getDailyGenerateCount() >= FREE_DAILY_LIMIT) {
            throw new LimitExceededException("Daily limit reached. Add your own API key for unlimited generates.");
        }
        int next = (user.getDailyGenerateCount() == null ? 0 : user.getDailyGenerateCount()) + 1;
        user.setDailyGenerateCount(next);
        userRepository.save(user);
        return next;
    }

    public int getRemainingGenerates(User user) {
        LocalDate today = LocalDate.now();
        if (user.getLastResetDate() == null || user.getLastResetDate().isBefore(today)) {
            return FREE_DAILY_LIMIT;
        }
        int used = user.getDailyGenerateCount() == null ? 0 : user.getDailyGenerateCount();
        int rem = FREE_DAILY_LIMIT - used;
        return Math.max(0, rem);
    }

    public void resetDailyCount(User user) {
        user.setDailyGenerateCount(0);
        user.setLastResetDate(LocalDate.now());
        userRepository.save(user);
    }
}
