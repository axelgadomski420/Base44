package com.purre.pets.post;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.purre.pets.common.ApiException;
import com.purre.pets.user.User;
import com.purre.pets.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Posty i Reels (0.4.0) + Reels Studio (0.5.0): dźwięki z biblioteki PURRE Sounds
 * i filtry CSS nakładane na media (jak TikTok). REEL — tylko PRO/ULTIMATE/PREMIUM (paywall).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PostService {

    private static final int MAX_MEDIA = 4;
    private static final int MAX_CAPTION = 2000;

    private final PostRepository postRepository;
    private final PostLikeRepository likeRepository;
    private final UserRepository userRepository;
    private final com.purre.pets.membership.MembershipService membershipService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public record MediaInput(String url, String mediaType) {}
    public record MediaDto(String url, String mediaType) {}

    public record PostDto(Long id, Long userId, String userName, String caption, String postType,
                          List<MediaDto> media, String soundId, String filterId, String planBadge,
                          int likes, boolean likedByMe, Instant createdAt) {}

    @Transactional
    public PostDto create(Long userId, String caption, String postType, List<MediaInput> media,
                          String soundId, String filterId) {
        String type = "POST".equalsIgnoreCase(postType) ? "POST" : "REEL";
        if (type.equals("REEL") && !membershipService.hasReelAccess(userId)) {
            throw ApiException.forbidden("PAYWALL_REQUIRED",
                    "Reels są dostępne w pakietach PRO, ULTIMATE i PREMIUM. Wybierz pakiet, aby publikować Reels.");
        }
        if (caption == null || caption.isBlank()) {
            throw ApiException.badRequest("EMPTY_CAPTION", "Dodaj opis do posta.");
        }
        List<MediaInput> safeMedia = media == null ? List.of() : media.stream()
                .filter(m -> m != null && m.url() != null && m.url().startsWith("/api/media/"))
                .limit(MAX_MEDIA)
                .toList();
        if (type.equals("REEL") && safeMedia.stream().noneMatch(m -> "VIDEO".equalsIgnoreCase(m.mediaType()))) {
            throw ApiException.badRequest("REEL_VIDEO_REQUIRED", "Reel wymaga co najmniej jednego wideo.");
        }
        String safeSound = soundId == null || soundId.isBlank() ? null : soundId.trim().substring(0, Math.min(64, soundId.trim().length()));
        String safeFilter = filterId == null || filterId.isBlank() ? null : filterId.trim().toUpperCase().substring(0, Math.min(32, filterId.trim().length()));
        Instant now = Instant.now();
        Post post = postRepository.save(Post.builder()
                .userId(userId)
                .caption(caption.trim().substring(0, Math.min(MAX_CAPTION, caption.trim().length())))
                .postType(type)
                .mediaJson(toJson(safeMedia))
                .soundId(safeSound)
                .filterId(safeFilter)
                .likes(0)
                .createdAt(now)
                .build());
        log.info("Post id={} ({}) użytkownika {}, dźwięk={}, filtr={}", post.getId(), type, userId, safeSound, safeFilter);
        return toDto(post, userId);
    }

    @Transactional(readOnly = true)
    public List<PostDto> feed(Long viewerId, int page) {
        return postRepository.findByOrderByCreatedAtDesc(PageRequest.of(Math.max(page, 0), 30)).stream()
                .map(p -> toDto(p, viewerId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PostDto> mine(Long userId) {
        return postRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 50)).stream()
                .map(p -> toDto(p, userId))
                .toList();
    }

    @Transactional
    public PostDto toggleLike(Long postId, Long userId) {
        Post post = postRepository.findById(postId).orElseThrow(() -> ApiException.notFound("Post nie istnieje."));
        var existing = likeRepository.findByPostIdAndUserId(postId, userId);
        if (existing.isPresent()) {
            likeRepository.delete(existing.get());
            post.setLikes(Math.max(0, post.getLikes() - 1));
        } else {
            likeRepository.save(PostLike.builder().postId(postId).userId(userId).createdAt(Instant.now()).build());
            post.setLikes(post.getLikes() + 1);
        }
        postRepository.save(post);
        return toDto(post, userId);
    }

    @Transactional
    public void deleteOwn(Long postId, Long userId) {
        Post post = postRepository.findById(postId).orElseThrow(() -> ApiException.notFound("Post nie istnieje."));
        if (!post.getUserId().equals(userId)) {
            throw ApiException.forbidden("NOT_OWNER", "To post innego użytkownika.");
        }
        likeRepository.deleteByPostId(postId);
        postRepository.delete(post);
    }

    /** Badge pakietu autora: PREMIUM > ULTIMATE > PRO > FREE. */
    private String planBadgeOf(User u) {
        if (u.getPremiumUntil() != null && u.getPremiumUntil().isAfter(Instant.now())) return "PREMIUM";
        boolean active = u.getPlanUntil() != null && u.getPlanUntil().isAfter(Instant.now())
                && ("PRO".equals(u.getPlan()) || "ULTIMATE".equals(u.getPlan()));
        return active ? u.getPlan() : "FREE";
    }

    private PostDto toDto(Post p, Long viewerId) {
        User author = userRepository.findById(p.getUserId()).orElse(null);
        String userName = author != null ? author.getDisplayName() : "Użytkownik";
        String badge = author != null ? planBadgeOf(author) : "FREE";
        boolean likedByMe = viewerId != null && likeRepository.existsByPostIdAndUserId(p.getId(), viewerId);
        return new PostDto(p.getId(), p.getUserId(), userName, p.getCaption(), p.getPostType(),
                fromJson(p.getMediaJson()), p.getSoundId(), p.getFilterId(), badge,
                p.getLikes(), likedByMe, p.getCreatedAt());
    }

    private String toJson(List<MediaInput> media) {
        if (media == null || media.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(media.stream()
                    .map(m -> new MediaDto(m.url(), m.mediaType() == null ? "IMAGE" : m.mediaType().toUpperCase()))
                    .toList());
        } catch (Exception e) {
            return null;
        }
    }

    private List<MediaDto> fromJson(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<MediaDto>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
