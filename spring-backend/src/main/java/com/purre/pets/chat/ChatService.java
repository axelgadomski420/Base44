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
import java.util.stream.Collectors;

/**
 * BENGOS Messenger (faza 2 + 0.4.0 + 0.5.0): rozmowy 1:1 i grupowe, historia, unseen,
 * seen (lastReadAt) i typing (WS), załączniki multimedialne, reakcje, odpowiedzi,
 * edycja, usuwanie (miękkie), wyszukiwanie i blokowanie użytkowników.
 * Push przez STOMP: /topic/conversation.{id}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private static final List<String> ALLOWED_EMOJI = List.of("❤️", "👍", "😂", "😮", "😢", "🔥");
    private static final int BLOCK_LIMIT = 200;

    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final MessageRepository messageRepository;
    private final MessageReactionRepository reactionRepository;
    private final BlockedUserRepository blockedUserRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ConversationDto startDirect(Long userId, Long otherUserId) {
        if (userId.equals(otherUserId)) {
            throw ApiException.badRequest("BAD_TARGET", "Nie można rozmawiać samemu ze sobą.");
        }
        if (blockedUserRepository.existsByBlockerIdAndBlockedId(otherUserId, userId)) {
            throw ApiException.forbidden("BLOCKED", "Ten użytkownik Cię zablokował.");
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
        return withReactions(messageRepository
                .findByConversationIdOrderByCreatedAtAsc(conversationId, PageRequest.of(page, 200)));
    }

    @Transactional
    public MessageDto send(Long userId, Long conversationId, String content) {
        return send(userId, conversationId, content, null, null, null, null);
    }

    /** 0.4.0: wiadomość z opcjonalnym załącznikiem; 0.5.0: odpowiedź (replyToId). */
    @Transactional
    public MessageDto send(Long userId, Long conversationId, String content,
                           String attachmentUrl, String attachmentType, String attachmentName,
                           Long replyToId) {
        requireMember(userId, conversationId);
        String text = content == null ? "" : content.trim();
        boolean hasAttachment = attachmentUrl != null && !attachmentUrl.isBlank();
        if (text.isEmpty() && !hasAttachment) {
            throw ApiException.badRequest("EMPTY_MESSAGE", "Wiadomość jest pusta.");
        }
        if (hasAttachment) {
            if (!attachmentUrl.startsWith("/api/media/")) {
                throw ApiException.badRequest("BAD_ATTACHMENT", "Załącznik musi pochodzić z naszego storage.");
            }
            if (attachmentType == null || attachmentType.isBlank()) attachmentType = "FILE";
            attachmentType = attachmentType.toUpperCase();
            if (!List.of("IMAGE", "VIDEO", "FILE").contains(attachmentType)) attachmentType = "FILE";
            attachmentUrl = attachmentUrl.substring(0, Math.min(500, attachmentUrl.length()));
            if (attachmentName != null) attachmentName = attachmentName.substring(0, Math.min(200, attachmentName.length()));
        }
        if (replyToId != null) {
            Message parent = messageRepository.findById(replyToId)
                    .orElseThrow(() -> ApiException.badRequest("BAD_REPLY", "Wiadomość, na którą odpowiadasz, nie istnieje."));
            if (!parent.getConversationId().equals(conversationId)) {
                throw ApiException.badRequest("BAD_REPLY", "Nie można odpowiedzieć na wiadomość z innej rozmowy.");
            }
        }
        Message m = messageRepository.save(Message.builder()
                .conversationId(conversationId).senderId(userId).replyToId(replyToId)
                .content(text.substring(0, Math.min(4000, text.length())))
                .attachmentUrl(hasAttachment ? attachmentUrl : null)
                .attachmentType(hasAttachment ? attachmentType : null)
                .attachmentName(hasAttachment ? attachmentName : null)
                .createdAt(Instant.now()).build());
        MessageDto dto = toDto(m, displayName(userId), Map.of());
        messagingTemplate.convertAndSend("/topic/conversation." + conversationId, dto);
        return dto;
    }

    /** 0.5.0: reakcja — toggle (ten sam emoji = usuwa). */
    @Transactional
    public MessageDto react(Long userId, Long messageId, String emoji) {
        Message m = messageRepository.findById(messageId)
                .orElseThrow(() -> ApiException.notFound("Wiadomość nie istnieje."));
        requireMember(userId, m.getConversationId());
        if (emoji == null || !ALLOWED_EMOJI.contains(emoji)) {
            throw ApiException.badRequest("BAD_EMOJI", "Dozwolone reakcje: ❤️ 👍 😂 😮 😢 🔥");
        }
        var existing = reactionRepository.findByMessageIdAndUserId(messageId, userId);
        if (existing.isPresent()) {
            if (existing.get().getEmoji().equals(emoji)) {
                reactionRepository.delete(existing.get());
            } else {
                existing.get().setEmoji(emoji);
                reactionRepository.save(existing.get());
            }
        } else {
            reactionRepository.save(MessageReaction.builder()
                    .messageId(messageId).userId(userId).emoji(emoji)
                    .createdAt(Instant.now()).build());
        }
        return broadcastUpdate(m);
    }

    /** 0.5.0: edycja — tylko autor, tylko treść tekstowa. */
    @Transactional
    public MessageDto edit(Long userId, Long messageId, String content) {
        Message m = messageRepository.findById(messageId)
                .orElseThrow(() -> ApiException.notFound("Wiadomość nie istnieje."));
        if (!m.getSenderId().equals(userId)) {
            throw ApiException.forbidden("NOT_OWNER", "Można edytować tylko własne wiadomości.");
        }
        if (m.getDeletedAt() != null) {
            throw ApiException.badRequest("DELETED", "Nie można edytować usuniętej wiadomości.");
        }
        String text = content == null ? "" : content.trim();
        if (text.isEmpty()) throw ApiException.badRequest("EMPTY_MESSAGE", "Wiadomość jest pusta.");
        m.setContent(text.substring(0, Math.min(4000, text.length())));
        m.setEditedAt(Instant.now());
        messageRepository.save(m);
        return broadcastUpdate(m);
    }

    /** 0.5.0: miękkie usunięcie — tylko autor. */
    @Transactional
    public MessageDto delete(Long userId, Long messageId) {
        Message m = messageRepository.findById(messageId)
                .orElseThrow(() -> ApiException.notFound("Wiadomość nie istnieje."));
        if (!m.getSenderId().equals(userId)) {
            throw ApiException.forbidden("NOT_OWNER", "Można usuwać tylko własne wiadomości.");
        }
        m.setDeletedAt(Instant.now());
        messageRepository.save(m);
        return broadcastUpdate(m);
    }

    /** 0.5.0: wyszukiwanie wiadomości we własnych rozmowach. */
    @Transactional(readOnly = true)
    public List<MessageDto> search(Long userId, String q) {
        String term = q == null ? "" : q.trim();
        if (term.length() < 2) return List.of();
        List<Long> conversationIds = participantRepository.findByUserId(userId).stream()
                .map(ConversationParticipant::getConversationId).toList();
        if (conversationIds.isEmpty()) return List.of();
        return withReactions(messageRepository.searchIn(conversationIds, term, PageRequest.of(0, 30)));
    }

    /** 0.5.0: blokowanie użytkownika — nie może rozpocząć rozmowy. */
    @Transactional
    public void block(Long userId, Long blockedId) {
        if (userId.equals(blockedId)) throw ApiException.badRequest("BAD_TARGET", "Nie można zablokować samego siebie.");
        if (blockedUserRepository.countByBlockerId(userId) >= BLOCK_LIMIT) {
            throw ApiException.badRequest("BLOCK_LIMIT", "Limit zablokowanych użytkowników.");
        }
        if (blockedUserRepository.findByBlockerIdAndBlockedId(userId, blockedId).isEmpty()) {
            blockedUserRepository.save(BlockedUser.builder()
                    .blockerId(userId).blockedId(blockedId).createdAt(Instant.now()).build());
        }
    }

    @Transactional
    public void unblock(Long userId, Long blockedId) {
        blockedUserRepository.findByBlockerIdAndBlockedId(userId, blockedId)
                .ifPresent(blockedUserRepository::delete);
    }

    @Transactional(readOnly = true)
    public List<Long> blockedIds(Long userId) {
        return blockedUserRepository.findByBlockerId(userId).stream().map(BlockedUser::getBlockedId).toList();
    }

    @Transactional
    public void markRead(Long userId, Long conversationId) {
        participantRepository.findByConversationIdAndUserId(conversationId, userId).ifPresent(p -> {
            p.setLastReadAt(Instant.now());
            participantRepository.save(p);
        });
    }

    private MessageDto broadcastUpdate(Message m) {
        Map<String, Long> reactions = reactionRepository.findByMessageIdIn(List.of(m.getId())).stream()
                .collect(Collectors.groupingBy(MessageReaction::getEmoji, Collectors.counting()));
        MessageDto dto = toDto(m, displayName(m.getSenderId()), reactions);
        messagingTemplate.convertAndSend("/topic/conversation." + m.getConversationId(), dto);
        return dto;
    }

    private List<MessageDto> withReactions(List<Message> messages) {
        if (messages.isEmpty()) return List.of();
        List<Long> ids = messages.stream().map(Message::getId).toList();
        Map<Long, Map<String, Long>> byMessage = reactionRepository.findByMessageIdIn(ids).stream()
                .collect(Collectors.groupingBy(MessageReaction::getMessageId,
                        Collectors.groupingBy(MessageReaction::getEmoji, Collectors.counting())));
        return messages.stream()
                .map(m -> toDto(m, displayName(m.getSenderId()), byMessage.getOrDefault(m.getId(), Map.of())))
                .toList();
    }

    private String displayName(Long userId) {
        return userRepository.findById(userId).map(User::getDisplayName).orElse("Użytkownik #" + userId);
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
            if (last.getDeletedAt() != null) {
                lastMessage = "🚫 Wiadomość usunięta";
            } else {
                lastMessage = (last.getContent() == null || last.getContent().isBlank()) && last.getAttachmentUrl() != null
                        ? "📎 Załącznik" : last.getContent();
            }
            lastAt = last.getCreatedAt();
        }
        return new ConversationDto(c.getId(), c.getType().name(), title, unread, lastMessage, lastAt,
                participants.size());
    }

    public record ConversationDto(Long id, String type, String title, long unread,
                                  String lastMessage, Instant lastMessageAt, int memberCount) {}

    public record MessageDto(Long id, Long conversationId, Long senderId, String senderName,
                             String content, String attachmentUrl, String attachmentType,
                             String attachmentName, Instant createdAt,
                             Long replyToId, Instant editedAt, boolean deleted,
                             Map<String, Long> reactions) {
        public static MessageDto toDto(Message m) {
            boolean deleted = m.getDeletedAt() != null;
            return new MessageDto(m.getId(), m.getConversationId(), m.getSenderId(), null,
                    deleted ? "" : m.getContent(), deleted ? null : m.getAttachmentUrl(),
                    deleted ? null : m.getAttachmentType(), deleted ? null : m.getAttachmentName(),
                    m.getCreatedAt(), m.getReplyToId(), m.getEditedAt(), deleted, Map.of());
        }
    }

    public record TypingDto(Long userId, String displayName, Long conversationId) {}
}
