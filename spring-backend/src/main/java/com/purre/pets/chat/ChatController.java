package com.purre.pets.chat;

import com.purre.pets.chat.ChatService.ConversationDto;
import com.purre.pets.chat.ChatService.MessageDto;
import com.purre.pets.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/conversations")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping
    public List<ConversationDto> list(@AuthenticationPrincipal UserPrincipal principal) {
        return chatService.list(principal.id());
    }

    @PostMapping("/direct")
    public ConversationDto startDirect(@AuthenticationPrincipal UserPrincipal principal,
                                       @RequestBody Map<String, Long> body) {
        return chatService.startDirect(principal.id(), body.get("otherUserId"));
    }

    @PostMapping("/group")
    public ConversationDto createGroup(@AuthenticationPrincipal UserPrincipal principal,
                                       @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Number> members = (List<Number>) body.getOrDefault("memberIds", List.of());
        return chatService.createGroup(principal.id(), (String) body.get("title"),
                members.stream().map(Number::longValue).toList());
    }

    @GetMapping("/{id}/messages")
    public List<MessageDto> messages(@AuthenticationPrincipal UserPrincipal principal,
                                     @PathVariable Long id,
                                     @RequestParam(defaultValue = "0") int page) {
        return chatService.messages(principal.id(), id, page);
    }

    @PostMapping("/{id}/read")
    public Map<String, Object> markRead(@AuthenticationPrincipal UserPrincipal principal,
                                        @PathVariable Long id) {
        chatService.markRead(principal.id(), id);
        return Map.of("ok", true);
    }

    /** 0.5.0 M10: reakcja na wiadomość (toggle). */
    @PostMapping("/messages/{messageId}/react")
    public MessageDto react(@AuthenticationPrincipal UserPrincipal principal,
                            @PathVariable Long messageId,
                            @RequestBody Map<String, String> body) {
        return chatService.react(principal.id(), messageId, body.get("emoji"));
    }

    /** 0.5.0 M10: edycja własnej wiadomości. */
    @PatchMapping("/messages/{messageId}")
    public MessageDto edit(@AuthenticationPrincipal UserPrincipal principal,
                           @PathVariable Long messageId,
                           @RequestBody Map<String, String> body) {
        return chatService.edit(principal.id(), messageId, body.getOrDefault("content", ""));
    }

    /** 0.5.0 M10: miękkie usunięcie własnej wiadomości. */
    @DeleteMapping("/messages/{messageId}")
    public MessageDto delete(@AuthenticationPrincipal UserPrincipal principal,
                             @PathVariable Long messageId) {
        return chatService.delete(principal.id(), messageId);
    }

    /** 0.5.0 M10: wyszukiwanie wiadomości we własnych rozmowach. */
    @GetMapping("/search")
    public List<MessageDto> search(@AuthenticationPrincipal UserPrincipal principal,
                                   @RequestParam("q") String q) {
        return chatService.search(principal.id(), q);
    }

    /** 0.5.0 M10: blokowanie użytkownika. */
    @PostMapping("/block")
    public Map<String, Object> block(@AuthenticationPrincipal UserPrincipal principal,
                                     @RequestBody Map<String, Long> body) {
        chatService.block(principal.id(), body.get("userId"));
        return Map.of("ok", true);
    }

    @DeleteMapping("/block/{userId}")
    public Map<String, Object> unblock(@AuthenticationPrincipal UserPrincipal principal,
                                       @PathVariable Long userId) {
        chatService.unblock(principal.id(), userId);
        return Map.of("ok", true);
    }

    @GetMapping("/blocked")
    public List<Long> blocked(@AuthenticationPrincipal UserPrincipal principal) {
        return chatService.blockedIds(principal.id());
    }
}
