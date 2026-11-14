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
    public java.util.Map<String, Object> markRead(@AuthenticationPrincipal UserPrincipal principal,
                                                  @PathVariable Long id) {
        chatService.markRead(principal.id(), id);
        return Map.of("ok", true);
    }
}