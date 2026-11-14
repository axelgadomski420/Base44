package com.purre.pets.verification;

import com.purre.pets.config.AppProperties;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Szyfrowanie dokumentów w spoczynku: AES-256-GCM (IV 12 B + ciphertext + tag).
 * Klucz: DOCUMENTS_ENCRYPTION_KEY (base64, 32 bajty). W trybie dev dopuszczalny dowolny ciąg —
 * hashujemy go SHA-256 do 32 bajtów, więc klucz zawsze ma poprawną długość.
 */
@Service
public class DocumentCryptoService {

    private static final int IV_LEN = 12;
    private static final int TAG_BITS = 128;
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public DocumentCryptoService(AppProperties props) {
        String raw = props.getCrypto().getDocumentsKey();
        if (raw == null || raw.isBlank()) {
            throw new IllegalStateException("DOCUMENTS_ENCRYPTION_KEY nie jest ustawiony — odmawiam startu bez szyfrowania dokumentów.");
        }
        try {
            byte[] keyBytes = Base64.getDecoder().decode(raw);
            if (keyBytes.length != 32) throw new IllegalArgumentException();
            this.key = new SecretKeySpec(keyBytes, "AES");
        } catch (IllegalArgumentException e) {
            try {
                byte[] derived = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
                this.key = new SecretKeySpec(derived, "AES");
            } catch (Exception ex) {
                throw new IllegalStateException("Nie można utworzyć klucza szyfrowania dokumentów.", ex);
            }
        }
    }

    public byte[] encrypt(byte[] plaintext) {
        try {
            byte[] iv = new byte[IV_LEN];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] ct = cipher.doFinal(plaintext);
            return ByteBuffer.allocate(IV_LEN + ct.length).put(iv).put(ct).array();
        } catch (Exception e) {
            throw new IllegalStateException("Błąd szyfrowania dokumentu.", e);
        }
    }

    public byte[] decrypt(byte[] blob) {
        try {
            ByteBuffer buf = ByteBuffer.wrap(blob);
            byte[] iv = new byte[IV_LEN];
            buf.get(iv);
            byte[] ct = new byte[buf.remaining()];
            buf.get(ct);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            return cipher.doFinal(ct);
        } catch (Exception e) {
            throw new IllegalStateException("Błąd deszyfrowania dokumentu.", e);
        }
    }
}