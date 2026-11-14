package com.purre.pets.chat;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, Long> {
    List<ConversationParticipant> findByUserId(Long userId);
    List<ConversationParticipant> findByConversationId(Long conversationId);
    Optional<ConversationParticipant> findByConversationIdAndUserId(Long conversationId, Long userId);
}