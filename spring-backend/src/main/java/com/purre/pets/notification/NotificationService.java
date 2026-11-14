package com.purre.pets.notification;

import com.purre.pets.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository repository;

    @Transactional
    public void create(Long userId, String type, String title, String body, String link) {
        repository.save(Notification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .body(body)
                .link(link)
                .read(false)
                .createdAt(Instant.now())
                .build());
    }

    @Transactional(readOnly = true)
    public List<Notification> mine(Long userId) {
        return repository.findTop50ByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return repository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markRead(Long userId, Long id) {
        Notification n = repository.findById(id).orElseThrow(() -> ApiException.notFound("Powiadomienie nie istnieje."));
        if (!n.getUserId().equals(userId)) {
            throw ApiException.forbidden("NOT_OWNER", "To powiadomienie nie należy do Ciebie.");
        }
        n.setRead(true);
        repository.save(n);
    }

    @Transactional
    public void markAllRead(Long userId) {
        repository.markAllRead(userId);
    }
}
