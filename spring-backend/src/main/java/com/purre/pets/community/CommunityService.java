package com.purre.pets.community;

import com.purre.pets.common.ApiException;
import com.purre.pets.user.User;
import com.purre.pets.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/** 0.5.0 M11: Społeczność — grupy rasowe/regionalne/tematyczne, posty, ankiety, reakcje. */
@Service
@RequiredArgsConstructor
public class CommunityService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository memberRepository;
    private final GroupPostRepository postRepository;
    private final PollOptionRepository pollOptionRepository;
    private final PollVoteRepository pollVoteRepository;
    private final PostLikeRepository likeRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<GroupDto> listGroups(Long viewerId, String kind) {
        return groupRepository.findAllByOrderByNameAsc().stream()
                .filter(g -> kind == null || kind.isBlank() || g.getKind().name().equalsIgnoreCase(kind))
                .map(g -> toGroupDto(g, viewerId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GroupDto> myGroups(Long viewerId) {
        return memberRepository.findByUserId(viewerId).stream()
                .map(m -> groupRepository.findById(m.getGroupId()).orElse(null))
                .filter(Objects::nonNull)
                .map(g -> toGroupDto(g, viewerId))
                .toList();
    }

    @Transactional
    public GroupDto create(Long userId, String name, String description, String kind,
                           String species, String breed, String region) {
        if (name == null || name.isBlank()) throw ApiException.badRequest("BAD_NAME", "Nazwa grupy jest wymagana.");
        Group.Kind k;
        try {
            k = Group.Kind.valueOf((kind == null || kind.isBlank() ? "TOPIC" : kind).toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("BAD_KIND", "Rodzaj grupy: BREED, REGION lub TOPIC.");
        }
        Group g = groupRepository.save(Group.builder()
                .name(name.trim()).description(description).kind(k)
                .species(species == null || species.isBlank() ? null : species.toUpperCase())
                .breed(breed).region(region)
                .createdBy(userId).createdAt(Instant.now()).build());
        memberRepository.save(GroupMember.builder().groupId(g.getId()).userId(userId).joinedAt(Instant.now()).build());
        return toGroupDto(g, userId);
    }

    @Transactional
    public GroupDto join(Long userId, Long groupId) {
        Group g = groupRepository.findById(groupId).orElseThrow(() -> ApiException.notFound("Grupa nie istnieje."));
        if (memberRepository.findByGroupIdAndUserId(groupId, userId).isEmpty()) {
            memberRepository.save(GroupMember.builder().groupId(groupId).userId(userId).joinedAt(Instant.now()).build());
        }
        return toGroupDto(g, userId);
    }

    @Transactional
    public void leave(Long userId, Long groupId) {
        memberRepository.findByGroupIdAndUserId(groupId, userId).ifPresent(memberRepository::delete);
    }

    @Transactional(readOnly = true)
    public List<PostDto> posts(Long viewerId, Long groupId) {
        requireMember(viewerId, groupId);
        return toPostDtos(postRepository.findTop50ByGroupIdOrderByCreatedAtDesc(groupId), viewerId);
    }

    @Transactional
    public PostDto createPost(Long userId, Long groupId, String content, String pollQuestion, List<String> options) {
        requireMember(userId, groupId);
        String text = content == null ? "" : content.trim();
        if (text.isEmpty()) throw ApiException.badRequest("EMPTY_POST", "Treść wpisu jest pusta.");
        boolean hasPoll = pollQuestion != null && !pollQuestion.isBlank();
        if (hasPoll && (options == null || options.size() < 2 || options.size() > 6)) {
            throw ApiException.badRequest("BAD_POLL", "Ankieta wymaga od 2 do 6 opcji.");
        }
        GroupPost post = postRepository.save(GroupPost.builder()
                .groupId(groupId).userId(userId)
                .content(text.substring(0, Math.min(4000, text.length())))
                .pollQuestion(hasPoll ? pollQuestion.trim() : null)
                .createdAt(Instant.now()).build());
        if (hasPoll) {
            int pos = 0;
            for (String label : options) {
                if (label == null || label.isBlank()) continue;
                pollOptionRepository.save(PollOption.builder()
                        .postId(post.getId()).label(label.trim().substring(0, Math.min(200, label.trim().length())))
                        .position(pos++).build());
            }
        }
        return toPostDtos(List.of(post), userId).get(0);
    }

    @Transactional
    public PostDto like(Long userId, Long postId) {
        GroupPost post = postRepository.findById(postId).orElseThrow(() -> ApiException.notFound("Wpis nie istnieje."));
        requireMember(userId, post.getGroupId());
        var existing = likeRepository.findByPostIdAndUserId(postId, userId);
        if (existing.isPresent()) likeRepository.delete(existing.get());
        else likeRepository.save(PostLike.builder().postId(postId).userId(userId).createdAt(Instant.now()).build());
        return toPostDtos(List.of(post), userId).get(0);
    }

    @Transactional
    public PostDto vote(Long userId, Long postId, Long optionId) {
        GroupPost post = postRepository.findById(postId).orElseThrow(() -> ApiException.notFound("Wpis nie istnieje."));
        requireMember(userId, post.getGroupId());
        PollOption option = pollOptionRepository.findById(optionId)
                .orElseThrow(() -> ApiException.notFound("Opcja nie istnieje."));
        if (!option.getPostId().equals(postId)) {
            throw ApiException.badRequest("BAD_OPTION", "Opcja należy do innej ankiety.");
        }
        var existing = pollVoteRepository.findByPostIdAndUserId(postId, userId);
        if (existing.isPresent()) existing.get().setOptionId(optionId);
        else pollVoteRepository.save(PollVote.builder().postId(postId).userId(userId).optionId(optionId).votedAt(Instant.now()).build());
        if (existing.isPresent()) pollVoteRepository.save(existing.get());
        return toPostDtos(List.of(post), userId).get(0);
    }

    private void requireMember(Long userId, Long groupId) {
        if (memberRepository.findByGroupIdAndUserId(groupId, userId).isEmpty()) {
            throw ApiException.forbidden("NOT_MEMBER", "Dołącz do grupy, aby zobaczyć i dodawać wpisy.");
        }
    }

    private GroupDto toGroupDto(Group g, Long viewerId) {
        return new GroupDto(g.getId(), g.getName(), g.getDescription(), g.getKind().name(),
                g.getSpecies(), g.getBreed(), g.getRegion(),
                memberRepository.countByGroupId(g.getId()),
                memberRepository.findByGroupIdAndUserId(g.getId(), viewerId).isPresent(),
                g.getCreatedBy());
    }

    private List<PostDto> toPostDtos(List<GroupPost> posts, Long viewerId) {
        if (posts.isEmpty()) return List.of();
        List<Long> ids = posts.stream().map(GroupPost::getId).toList();
        Map<Long, List<PollOption>> options = pollOptionRepository.findByPostIdIn(ids).stream()
                .collect(Collectors.groupingBy(PollOption::getPostId));
        Map<Long, List<PollVote>> votes = pollVoteRepository.findByPostIdIn(ids).stream()
                .collect(Collectors.groupingBy(PollVote::getPostId));
        Map<Long, List<PostLike>> likes = likeRepository.findByPostIdIn(ids).stream()
                .collect(Collectors.groupingBy(PostLike::getPostId));
        Map<Long, String> names = new HashMap<>();
        for (GroupPost p : posts) {
            names.computeIfAbsent(p.getUserId(), uid -> userRepository.findById(uid)
                    .map(User::getDisplayName).orElse("Użytkownik #" + uid));
        }
        return posts.stream().map(p -> {
            var myVote = votes.getOrDefault(p.getId(), List.of()).stream()
                    .filter(v -> v.getUserId().equals(viewerId)).findFirst().map(PollVote::getOptionId).orElse(null);
            List<PostDto.PollOptionDto> optDtos = options.getOrDefault(p.getId(), List.of()).stream()
                    .map(o -> new PostDto.PollOptionDto(o.getId(), o.getLabel(),
                            votes.getOrDefault(p.getId(), List.of()).stream().filter(v -> v.getOptionId().equals(o.getId())).count()))
                    .toList();
            return new PostDto(p.getId(), p.getGroupId(), p.getUserId(), names.get(p.getUserId()),
                    p.getContent(), p.getPollQuestion(), optDtos,
                    likes.getOrDefault(p.getId(), List.of()).size(),
                    likes.getOrDefault(p.getId(), List.of()).stream().anyMatch(l -> l.getUserId().equals(viewerId)),
                    p.getCreatedAt());
        }).toList();
    }

    public record GroupDto(Long id, String name, String description, String kind,
                           String species, String breed, String region,
                           long memberCount, boolean joined, Long createdBy) {}

    public record PostDto(Long id, Long groupId, Long userId, String userName, String content,
                          String pollQuestion, List<PollOptionDto> options,
                          long likes, boolean likedByMe, Instant createdAt) {
        public record PollOptionDto(Long id, String label, long votes) {}
    }
}
