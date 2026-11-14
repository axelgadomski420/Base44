package com.purre.pets.post;

import com.purre.pets.post.PostService.MediaInput;
import com.purre.pets.post.PostService.PostDto;
import com.purre.pets.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    public record CreatePostRequest(String caption, String postType, List<MediaInput> media) {}

    @PostMapping
    public PostDto create(@AuthenticationPrincipal UserPrincipal principal, @RequestBody CreatePostRequest req) {
        return postService.create(principal.id(), req.caption(), req.postType(), req.media());
    }

    /** Publiczny feed postów (jak ogłoszenia). */
    @GetMapping("/feed")
    public List<PostDto> feed(@AuthenticationPrincipal(required = false) UserPrincipal principal,
                              @RequestParam(defaultValue = "0") int page) {
        return postService.feed(principal == null ? null : principal.id(), page);
    }

    @GetMapping("/mine")
    public List<PostDto> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return postService.mine(principal.id());
    }

    @PostMapping("/{id}/like")
    public PostDto like(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return postService.toggleLike(id, principal.id());
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        postService.deleteOwn(id, principal.id());
        return Map.of("ok", true);
    }
}
