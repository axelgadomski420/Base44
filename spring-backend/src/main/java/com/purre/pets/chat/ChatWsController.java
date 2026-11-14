package com.purre.pets.chat;

import com.purre.pets.chat.ChatService.TypingDto;
import com.purre.pets.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

/**
 * STOMP: /app/chat.send {conversationId, content, attachmentUrl?, attachmentType?, attachmentName?, replyToId?}
 *        → /topic/conversation.{id}
 *        /app/chat.typing {conversationId} → /topic/typing.{id}
 */
@Controller
@RequiredArgsConstructor
public class ChatWsController {

    private final ChatService chatService;
    private final com.purre.pets.user.UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.send")
    public void send(@Payload Map<String, Object> payload, Principal principal) {
        UserPrincipal user = extract(principal);
        if (user == null) return;
        Long conversationId = ((Number) payload.get("conversationId")).longValue();
        String content = String.valueOf(payload.getOrDefault("content", ""));
        String attachmentUrl = str(payload.get("attachmentUrl"));
        String attachmentType = str(payload.get("attachmentType"));
        String attachmentName = str(payload.get("attachmentName"));
        Object replyRaw = payload.get("replyToId");
        Long replyToId = replyRaw instanceof Number n ? n.longValue() : null;
        chatService.send(user.id(), conversationId, content, attachmentUrl, attachmentType, attachmentName, replyToId);
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload Map<String, Object> payload, Principal principal) {
        UserPrincipal user = extract(principal);
        if (user == null) return;
        Long conversationId = ((Number) payload.get("conversationId")).longValue();
        String name = userRepository.findById(user.id()).map(u -> u.getDisplayName()).orElse("Ktoś");
        messagingTemplate.convertAndSend("/topic/typing." + conversationId,
                new TypingDto(user.id(), name, conversationId));
    }

    private String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private UserPrincipal extract(Principal principal) {
        if (principal instanceof Authentication auth && auth.getPrincipal() instanceof UserPrincipal up) {
            return up;
        }
        return null;
    }
}
