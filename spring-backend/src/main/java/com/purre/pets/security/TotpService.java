package com.purre.pets.security;

import com.purre.pets.common.ApiException;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

/**
 * TOTP (RFC 6238, SHA1, 6 cyfr, krok 30 s, okno ±1) — bez zewnętrznych zależności.
 * Sekret w Base32 (kompatybilny z Google Authenticator / Authy / Aegis).
 */
@Service
public class TotpService {

    private static final String ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final long STEP_SECONDS = 30L;
    private final SecureRandom random = new SecureRandom();

    public String generateSecret() {
        byte[] buf = new byte[20];
        random.nextBytes(buf);
        return base32(buf);
    }

    public String otpauthUri(String secret, String email) {
        String label = URLEncoder.encode("PURRE PETS:" + email, StandardCharsets.UTF_8);
        String issuer = URLEncoder.encode("PURRE PETS", StandardCharsets.UTF_8);
        return "otpauth://totp/" + label + "?secret=" + secret + "&issuer=" + issuer
                + "&algorithm=SHA1&digits=6&period=30";
    }

    public void verifyOrThrow(String base32Secret, String code) {
        if (base32Secret == null || base32Secret.isBlank()) {
            throw ApiException.badRequest("NO_SECRET", "2FA nie zostało skonfigurowane.");
        }
        if (code == null || !code.matches("\\d{6}")) {
            throw ApiException.badRequest("BAD_CODE", "Kod musi mieć 6 cyfr.");
        }
        long counter = System.currentTimeMillis() / 1000L / STEP_SECONDS;
        for (int i = -1; i <= 1; i++) {
            if (totp(base32Secret, counter + i).equals(code)) return;
        }
        throw ApiException.badRequest("INVALID_CODE", "Nieprawidłowy kod 2FA.");
    }

    private String totp(String base32Secret, long counter) {
        byte[] key = base32Decode(base32Secret);
        byte[] msg = new byte[8];
        long c = counter;
        for (int i = 7; i >= 0; i--) { msg[i] = (byte) (c & 0xFF); c >>= 8; }
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] h = mac.doFinal(msg);
            int off = h[h.length - 1] & 0x0F;
            int bin = ((h[off] & 0x7F) << 24) | ((h[off + 1] & 0xFF) << 16)
                    | ((h[off + 2] & 0xFF) << 8) | (h[off + 3] & 0xFF);
            return String.format("%06d", bin % 1_000_000);
        } catch (Exception e) {
            throw new IllegalStateException("Błąd TOTP", e);
        }
    }

    private String base32(byte[] data) {
        StringBuilder sb = new StringBuilder();
        int buffer = 0, bits = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bits += 8;
            while (bits >= 5) { sb.append(ALPHABET[(buffer >> (bits - 5)) & 31]); bits -= 5; }
        }
        if (bits > 0) sb.append(ALPHABET[(buffer << (5 - bits)) & 31]);
        return sb.toString();
    }

    private byte[] base32Decode(String s) {
        String clean = s.trim().replace("=", "").toUpperCase();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        int buffer = 0, bits = 0;
        for (char ch : clean.toCharArray()) {
            int v = ALPHABET.indexOf(ch);
            if (v < 0) throw ApiException.badRequest("BAD_SECRET", "Nieprawidłowy format sekretu.");
            buffer = (buffer << 5) | v;
            bits += 5;
            if (bits >= 8) { out.write((buffer >> (bits - 8)) & 0xFF); bits -= 8; }
        }
        return out.toByteArray();
    }
}