package com.purre.pets.community;

import com.purre.pets.community.CommunityService.GroupDto;
import com.purre.pets.community.CommunityService.PostDto;
import com.purre.pets.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/groups")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;

    @GetMapping
    public List<GroupDto> list(@AuthenticationPrincipal UserPrincipal principal,
                               @RequestParam(required = false) String kind) {
        return communityService.listGroups(principal.id(), kind);
    }

    @GetMapping("/mine")
    public List<GroupDto> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return communityService.myGroups(principal.id());
    }

    @PostMapping
    public ResponseEntity<GroupDto> create(@AuthenticationPrincipal UserPrincipal principal,
                                           @RequestBody Map<String, String> body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(communityService.create(
                principal.id(), body.get("name"), body.get("description"), body.get("kind"),
                body.get("species"), body.get("breed"), body.get("region")));
    }

    @PostMapping("/{id}/join")
    public GroupDto join(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return communityService.join(principal.id(), id);
    }

    @DeleteMapping("/{id}/join")
    public ResponseEntity<Void> leave(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        communityService.leave(principal.id(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/posts")
    public List<PostDto> posts(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return communityService.posts(principal.id(), id);
    }

    @PostMapping("/{id}/posts")
    public ResponseEntity<PostDto> createPost(@AuthenticationPrincipal UserPrincipal principal,
                                              @PathVariable Long id,
                                              @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> options = (List<String>) body.getOrDefault("options", List.of());
        return ResponseEntity.status(HttpStatus.CREATED).body(communityService.createPost(
                principal.id(), id, (String) body.get("content"), (String) body.get("pollQuestion"), options));
    }

    @PostMapping("/posts/{postId}/like")
    public PostDto like(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long postId) {
        return communityService.like(principal.id(), postId);
    }

    @PostMapping("/posts/{postId}/vote")
    public PostDto vote(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long postId,
                        @RequestBody Map<String, Long> body) {
        return communityService.vote(principal.id(), postId, body.get("optionId"));
    }
}
