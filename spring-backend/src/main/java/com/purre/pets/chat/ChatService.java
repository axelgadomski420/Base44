package com.purre.pets.chat;

import com.purre.pets.common.ApiException;
import com.purre.pets.user.User;
import com.purre.pets.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/**
 * BENGOS Messenger (faza 2): rozmowy 1:1 i grupowe, historia, unseen,
 * seen (lastReadAt) i typing (WS). Push przez STOMP: /topic/conversation.{id}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ConversationDto startDirect(Long userId, Long otherUserId) {
        if (userId.equals(otherUserId)) {
            throw ApiException.badRequest("BAD_TARGET", "Nie można rozmawiać samemu ze sobą.");
        }
        User other = userRepository.findById(otherUserId)
                .orElseThrow(() -> ApiException.notFound("Użytkownik nie istnieje."));
        var existing = conversationRepository.findDirect(userId, otherUserId);
        if (existing.isPresent()) return toDto(existing.get(), userId);

        Instant now = Instant.now();
        Conversation c = conversationRepository.save(Conversation.builder()
                .type(Conversation.Type.DIRECT).createdBy(userId).createdAt(now).build());
        participantRepository.save(ConversationParticipant.builder().conversationId(c.getId()).userId(userId).build());
        participantRepository.save(ConversationParticipant.builder().conversationId(c.getId()).userId(otherUserId).build());
        return toDto(c, userId);
    }

    @Transactional
    public ConversationDto createGroup(Long userId, String title, List<Long> memberIds) {
        if (title == null || title.isBlank()) throw ApiException.badRequest("BAD_TITLE", "Nazwa grupy jest wymagana.");
        Set<Long> members = new LinkedHashSet<>(memberIds);
        members.add(userId);
        Instant now = Instant.now();
        Conversation c = conversationRepository.save(Conversation.builder()
                .type(Conversation.Type.GROUP).title(title.trim()).createdBy(userId).createdAt(now).build());
        for (Long m : members) {
            participantRepository.save(ConversationParticipant.builder().conversationId(c.getId()).userId(m).build());
        }
        return toDto(c, userId);
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> list(Long userId) {
        return participantRepository.findByUserId(userId).stream()
                .map(p -> conversationRepository.findById(p.getConversationId()).orElse(null))
                .filter(Objects::nonNull)
                .map(c -> toDto(c, userId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MessageDto> messages(Long userId, Long conversationId, int page) {
        requireMember(userId, conversationId);
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId, PageRequest.of(page, 200))
                .stream().map(ChatService::toDto).toList();
    }

    @Transactional
    public MessageDto send(Long userId, Long conversationId, String content) {
        requireMember(userId, conversationId);
        if (content == null || content.isBlank()) throw ApiException.badRequest("EMPTY_MESSAGE", "Wiadomość jest pusta.");
        Message m = messageRepository.save(Message.builder()
                .conversationId(conversationId).senderId(userId)
                .content(content.trim().substring(0, Math.min(4000, content.trim().length())))
                .createdAt(Instant.now()).build());
        MessageDto dto = toDto(m);
        messagingTemplate.convertAndSend("/topic/conversation." + conversationId, dto);
        return dto;
    }

    @Transactional
    public void markRead(Long userId, Long conversationId) {
        participantRepository.findByConversationIdAndUserId(conversationId, userId).ifPresent(p -> {
            p.setLastReadAt(Instant.now());
            participantRepository.save(p);
        });
    }

    private void requireMember(Long userId, Long conversationId) {
        if (participantRepository.findByConversationIdAndUserId(conversationId, userId).isEmpty()) {
            throw ApiException.forbidden("NOT_MEMBER", "Nie jesteś uczestnikiem tej rozmowy.");
        }
    }

    private ConversationDto toDto(Conversation c, Long viewerId) {
        var participants = participantRepository.findByConversationId(c.getId());
        String title = c.getTitle();
        if (c.getType() == Conversation.Type.DIRECT) {
            title = participants.stream().filter(p -> !p.getUserId().equals(viewerId)).findFirst()
                    .flatMap(p -> userRepository.findById(p.getUserId()))
                    .map(User::getDisplayName).orElse("Rozmowa");
        }
        long unread = 0;
        String lastMessage = null;
        Instant lastAt = null;
        var p = participants.stream().filter(x -> x.getUserId().equals(viewerId)).findFirst().orElse(null);
        if (p != null) {
            unread = messageRepository.countUnread(c.getId(), viewerId, p.getLastReadAt());
        }
        var last = messageRepository.findFirstByConversationIdOrderByCreatedAtDesc(c.getId()).orElse(null);
        if (last != null) {
            lastMessage = last.getContent();
            lastAt = last.getCreatedAt();
        }
        return new ConversationDto(c.getId(), c.getType().name(), title, unread, lastMessage, lastAt,
                participants.size());
    }

    public record ConversationDto(Long id, String type, String title, long unread,
                                  String lastMessage, Instant lastMessageAt, int memberCount) {}

    public record MessageDto(Long id, Long conversationId, Long senderId, String senderName,
                             String content, Instant createdAt) {
        public static MessageDto toDto(Message m) { return new MessageDto(m.getId(), m.getConversationId(),
                m.getSenderId(), null, m.getContent(), m.getCreatedAt()); }
    }

    public record TypingDto(Long userId, String displayName, Long conversationId) {}
}