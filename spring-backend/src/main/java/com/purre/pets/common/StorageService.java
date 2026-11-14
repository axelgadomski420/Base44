package com.purre.pets.common;

import com.purre.pets.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.*;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StorageService {

    private final AppProperties props;

    private static final Set<String> ALLOWED_IMAGE = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> ALLOWED_DOC = Set.of("image/jpeg", "image/png", "image/webp", "application/pdf");
    private static final Set<String> ALLOWED_VIDEO = Set.of("video/mp4", "video/webm");

    public boolean isAllowedImage(String ct) { return ALLOWED_IMAGE.contains(ct); }
    public boolean isAllowedDoc(String ct) { return ALLOWED_DOC.contains(ct); }
    public boolean isAllowedVideo(String ct) { return ALLOWED_VIDEO.contains(ct); }

    public String storeMedia(byte[] bytes, String contentType, String originalName) {
        String ext = extension(originalName, contentType);
        Path dir = Paths.get(props.getUpload().getDir(), "media", String.valueOf(LocalDate.now().getYear()),
                String.format("%02d", LocalDate.now().getMonthValue()));
        return store(dir, UUID.randomUUID() + "." + ext, bytes);
    }

    public String storeEncryptedDocument(byte[] bytes, String originalName) {
        Path dir = Paths.get(props.getUpload().getDir(), "documents");
        return store(dir, UUID.randomUUID() + ".enc", bytes);
    }

    public byte[] read(String storedPath) {
        try {
            return Files.readAllBytes(Paths.get(storedPath));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public void delete(String storedPath) {
        try {
            Files.deleteIfExists(Paths.get(storedPath));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private String store(Path dir, String fileName, byte[] bytes) {
        try {
            Files.createDirectories(dir);
            Path target = dir.resolve(fileName);
            Files.write(target, bytes, StandardOpenOption.CREATE_NEW);
            return target.toAbsolutePath().normalize().toString();
        } catch (IOException e) {
            throw new UncheckedIOException("Nie udało się zapisać pliku.", e);
        }
    }

    private String extension(String originalName, String contentType) {
        if (originalName != null && originalName.contains(".")) {
            String ext = originalName.substring(originalName.lastIndexOf('.') + 1).toLowerCase();
            if (ext.matches("[a-z0-9]{2,5}")) return ext;
        }
        return switch (contentType) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            case "application/pdf" -> "pdf";
            case "video/mp4" -> "mp4";
            case "video/webm" -> "webm";
            default -> "bin";
        };
    }
}