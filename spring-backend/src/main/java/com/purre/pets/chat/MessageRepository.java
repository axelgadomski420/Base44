package com.purre.pets.chat;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByConversationIdOrderByCreatedAtAsc(Long conversationId, Pageable pageable);
    Optional<Message> findFirstByConversationIdOrderByCreatedAtDesc(Long conversationId);

    @Query("""
            SELECT COUNT(m) FROM Message m
            WHERE m.conversationId = :conversationId
              AND m.senderId <> :userId
              AND m.deletedAt IS NULL
              AND (:lastRead IS NULL OR m.createdAt > :lastRead)
            """)
    long countUnread(@Param("conversationId") Long conversationId,
                     @Param("userId") Long userId,
                     @Param("lastRead") java.time.Instant lastRead);

    /** 0.5.0 M10: wyszukiwanie wiadomości w rozmowach użytkownika. */
    @Query("""
            SELECT m FROM Message m
            WHERE m.conversationId IN :conversationIds
              AND m.deletedAt IS NULL
              AND LOWER(m.content) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY m.createdAt DESC
            """)
    List<Message> searchIn(@Param("conversationIds") List<Long> conversationIds,
                           @Param("q") String q,
                           Pageable pageable);
}
