package com.purre.pets.security;

import com.purre.pets.user.User;
import com.purre.pets.user.UserRepository;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Uwierzytelnienie WebSocket/STOMP: token JWT z nagłówka CONNECT (Authorization: Bearer …).
 * Bez poprawnego tokenu klient nie może publikować ani subskrybować.
 */
@Component
@RequiredArgsConstructor
public class AuthChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String header = accessor.getFirstNativeHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) {
                throw new IllegalArgumentException("Brak tokenu uwierzytelniającego WebSocket.");
            }
            try {
                Claims claims = jwtService.parse(header.substring(7));
                User user = userRepository.findById(Long.valueOf(claims.getSubject())).orElse(null);
                if (user == null) throw new IllegalArgumentException("Nieznany użytkownik.");
                UserPrincipal principal = new UserPrincipal(user.getId(), user.getEmail(), user.getRole());
                accessor.setUser(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
            } catch (IllegalArgumentException e) {
                throw e;
            } catch (Exception e) {
                throw new IllegalArgumentException("Nieprawidłowy token WebSocket.");
            }
        }
        return message;
    }
}