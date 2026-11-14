package com.purre.pets.stripe;

import com.purre.pets.config.AppProperties;
import com.purre.pets.user.User;
import com.purre.pets.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final Optional<JavaMailSender> mailSender;
    private final AppProperties props;
    private final UserRepository userRepository;

    public void sendCoinsPurchased(Long userId, int coins, long amountGrosze) {
        String email = userRepository.findById(userId).map(User::getEmail).orElse(null);
        if (email == null) return;
        String text = "Dziękujemy za zakup!\n\n"
                + "DoTwojego konta dodano: " + coins + " PURRE Coins\n"
                + "Kwota: " + String.format("%.2f zł", amountGrosze / 100.0) + "\n\n"
                + "Historia zakupów: " + props.getFrontendUrl() + "/wallet\n\n"
                + "PURRE PETS";
        if (mailSender.isEmpty()) {
            log.info("SMTP nieskonfigurowany — e-mail potwierdzający (user={}, coins={}) tylko do logów.", userId, coins);
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(props.getFrontendUrl().contains("localhost") ? "no-reply@localhost" : "no-reply@bengos.pl");
            msg.setTo(email);
            msg.setSubject("PURRE PETS — zakup PURRE Coins potwierdzony");
            msg.setText(text);
            mailSender.get().send(msg);
        } catch (Exception e) {
            log.error("Nie udało się wysłać e-maila potwierdzającego (user={}): {}", userId, e.getMessage());
        }
    }
}