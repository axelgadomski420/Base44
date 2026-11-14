package com.purre.pets.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    @Query("""
            SELECT c FROM Conversation c
            JOIN ConversationParticipant p1 ON p1.conversationId = c.id AND p1.userId = :a
            JOIN ConversationParticipant p2 ON p2.conversationId = c.id AND p2.userId = :b
            WHERE c.type = 'DIRECT'
            """)
    Optional<Conversation> findDirect(@Param("a") Long a, @Param("b") Long b);
}