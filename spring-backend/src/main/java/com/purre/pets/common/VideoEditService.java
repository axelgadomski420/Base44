package com.purre.pets.common;

import com.purre.pets.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

/**
 * Edytor wideo (faza 4) oparty o FFmpeg: przycinanie, wyciszanie, przyspieszenie
 * i podkład muzyczny z regulacją głośności. Wynik zawsze MP4 (H.264 + AAC, faststart),
 * gotowy do HoloFeed. Wejście max 10 MB (limit uploadu), timeout renderu 120 s.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VideoEditService {

    private static final Pattern MEDIA_URL = Pattern.compile("^/api/media/(\\d{4})/(\\d{2})/([A-Za-z0-9._-]+)$");
    private static final Set<String> ALLOWED_MUSIC = Set.of("audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/aac", "audio/ogg");

    private final StorageService storageService;
    private final AppProperties props;

    public record EditOptions(Double trimStart, Double trimEnd, boolean mute,
                              Double speed, Double videoVolume, Double musicVolume) {}

    public String edit(String mediaUrl, EditOptions o, byte[] music, String musicContentType, String musicName) {
        Path src = resolveMediaPath(mediaUrl);
        double trimStart = clamp(o.trimStart() == null ? 0 : o.trimStart(), 0, 600);
        Double trimEnd = o.trimEnd() == null ? null : clamp(o.trimEnd(), 0.1, 3600);
        if (trimEnd != null && trimEnd <= trimStart) {
            throw ApiException.badRequest("BAD_TRIM", "Koniec przycinania musi być po początku.");
        }
        double speed = clamp(o.speed() == null ? 1.0 : o.speed(), 0.5, 2.0);
        double videoVolume = clamp(o.videoVolume() == null ? 1.0 : o.videoVolume(), 0, 1);
        double musicVolume = clamp(o.musicVolume() == null ? 0.5 : o.musicVolume(), 0, 1);
        boolean hasMusic = music != null && music.length > 0;
        if (hasMusic && (musicContentType == null || !ALLOWED_MUSIC.contains(musicContentType))) {
            throw ApiException.badRequest("BAD_MUSIC", "Dozwolone audio: MP3, M4A, WAV, AAC, OGG.");
        }
        if (o.mute() && hasMusic) {
            throw ApiException.badRequest("MUTE_AND_MUSIC", "Nie można wyciszyć wideo i dodać podkładu jednocześnie — wybierz jedno.");
        }

        Path work = null;
        try {
            work = Files.createTempDirectory("purre-video");
            Path in = work.resolve("in" + extOf(src.getFileName().toString(), ".mp4"));
            Files.copy(src, in, StandardCopyOption.REPLACE_EXISTING);
            Path out = work.resolve("out.mp4");
            Path musicPath = null;
            if (hasMusic) {
                musicPath = work.resolve("music" + extFromCt(musicContentType));
                Files.write(musicPath, music);
            }
            runFfmpeg(buildCommand(in, out, trimStart, trimEnd, o.mute(), speed, videoVolume, musicVolume, musicPath));
            if (!Files.exists(out) || Files.size(out) == 0) {
                throw ApiException.badRequest("RENDER_EMPTY", "Renderowanie nie wygenerowało pliku — sprawdź parametry.");
            }
            byte[] result = Files.readAllBytes(out);
            if (result.length > 10 * 1024 * 1024) {
                throw ApiException.badRequest("TOO_LARGE", "Wynik przekracza 10 MB — skróć wideo lub zmniejsz jakość.");
            }
            return storageService.storeMedia(result, "video/mp4", "purre-edited.mp4");
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Błąd edycji wideo: {}", e.getMessage(), e);
            throw ApiException.badRequest("VIDEO_EDIT_FAILED", "Nie udało się przetworzyć wideo.");
        } finally {
            cleanup(work);
        }
    }

    private List<String> buildCommand(Path in, Path out, double trimStart, Double trimEnd, boolean mute,
                                      double speed, double videoVolume, double musicVolume, Path musicPath) {
        List<String> cmd = new ArrayList<>(List.of("ffmpeg", "-y"));
        if (trimStart > 0) cmd.addAll(List.of("-ss", String.valueOf(trimStart)));
        cmd.addAll(List.of("-i", in.toString()));
        if (musicPath != null) cmd.addAll(List.of("-i", musicPath.toString()));
        if (trimEnd != null) cmd.addAll(List.of("-to", String.valueOf(trimEnd)));

        boolean speedUp = Math.abs(speed - 1.0) > 1e-6;
        if (mute) {
            cmd.add("-an");
        } else if (musicPath != null) {
            String fc = "[0:a]volume=" + videoVolume + "[a0];[1:a]volume=" + musicVolume + "[a1];"
                    + "[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]"
                    + (speedUp ? ";[aout]atempo=" + speed + "[afinal]" : "");
            cmd.addAll(List.of("-filter_complex", fc, "-map", "0:v:0", "-map", speedUp ? "[afinal]" : "[aout]"));
        } else {
            if (videoVolume < 1) cmd.addAll(List.of("-af", "volume=" + videoVolume));
            if (speedUp) cmd.addAll(List.of("-af", (videoVolume < 1 ? "volume=" + videoVolume + "," : "") + "atempo=" + speed));
        }
        if (speedUp) cmd.addAll(List.of("-vf", "setpts=PTS/" + speed));
        cmd.addAll(List.of("-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out.toString()));
        return cmd;
    }

    private void runFfmpeg(List<String> cmd) throws IOException, InterruptedException {
        log.info("FFmpeg: {}", String.join(" ", cmd));
        Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
        StringBuilder output = new StringBuilder();
        try (InputStream is = p.getInputStream()) {
            byte[] buf = new byte[4096];
            int n;
            while ((n = is.read(buf)) > 0 && output.length() < 16_000) output.append(new String(buf, 0, n));
        }
        if (!p.waitFor(120, TimeUnit.SECONDS)) {
            p.destroyForcibly();
            throw ApiException.badRequest("RENDER_TIMEOUT", "Renderowanie przekroczyło limit czasu.");
        }
        if (p.exitValue() != 0) {
            log.warn("FFmpeg exit={} tail: {}", p.exitValue(), output.substring(Math.max(0, output.length() - 800)));
            throw ApiException.badRequest("RENDER_FAILED", "FFmpeg nie mógł przetworzyć pliku — sprawdź format wideo.");
        }
    }

    /** Mapowanie /api/media/RRRR/MM/plik → ścieżka na dysku, z ochroną przed path traversal. */
    private Path resolveMediaPath(String url) {
        if (url == null) throw ApiException.badRequest("BAD_URL", "Brak adresu wideo.");
        var m = MEDIA_URL.matcher(url);
        if (!m.matches()) throw ApiException.badRequest("BAD_URL", "Nieprawidłowy adres wideo.");
        Path base = Paths.get(props.getUpload().getDir(), "media").toAbsolutePath().normalize();
        Path target = base.resolve(m.group(1)).resolve(m.group(2)).resolve(m.group(3)).normalize();
        if (!target.startsWith(base) || !Files.exists(target)) {
            throw ApiException.notFound("Nie znaleziono pliku wideo.");
        }
        return target;
    }

    private double clamp(double v, double min, double max) { return Math.max(min, Math.min(max, v)); }

    private String extOf(String name, String fallback) {
        int i = name.lastIndexOf('.');
        return i >= 0 ? name.substring(i) : fallback;
    }

    private String extFromCt(String ct) {
        return switch (ct) {
            case "audio/mpeg" -> ".mp3";
            case "audio/mp4" -> ".m4a";
            case "audio/wav", "audio/x-wav" -> ".wav";
            case "audio/aac" -> ".aac";
            case "audio/ogg" -> ".ogg";
            default -> ".bin";
        };
    }

    private void cleanup(Path work) {
        if (work == null) return;
        try (var stream = Files.list(work)) {
            stream.forEach(f -> { try { Files.deleteIfExists(f); } catch (IOException ignored) {} });
            Files.deleteIfExists(work);
        } catch (IOException ignored) {}
    }
}