package com.purre.pets.moderation;

import com.purre.pets.moderation.Report;
import com.purre.pets.security.UserPrincipal;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    public record CreateReportRequest(Long listingId, Long reportedUserId, String reason,
                                      @Size(max = 1000) String description) {}

    public record ReportDto(Long id, Long reporterId, Long listingId, Long reportedUserId, String reason,
                            String description, String status, String resolutionNote, Instant createdAt) {
        public static ReportDto from(Report r) {
            return new ReportDto(r.getId(), r.getReporterId(), r.getListingId(), r.getReportedUserId(),
                    r.getReason().name(), r.getDescription(), r.getStatus().name(),
                    r.getResolutionNote(), r.getCreatedAt());
        }
    }

    @PostMapping
    public ReportDto create(@AuthenticationPrincipal UserPrincipal principal,
                            @RequestBody CreateReportRequest req) {
        return ReportDto.from(reportService.create(principal.id(), req.listingId(),
                req.reportedUserId(), req.reason(), req.description()));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('MODERATOR','ADMIN')")
    public Page<ReportDto> queue(@RequestParam(defaultValue = "PENDING") String status,
                                 @RequestParam(defaultValue = "0") int page,
                                 @RequestParam(defaultValue = "30") int size) {
        Report.Status s;
        try {
            s = Report.Status.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            s = Report.Status.PENDING;
        }
        return reportService.queue(s, page, size).map(ReportDto::from);
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('MODERATOR','ADMIN')")
    public ReportDto resolve(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                             @RequestBody Map<String, String> body) {
        boolean upheld = !"false".equalsIgnoreCase(body.getOrDefault("upheld", "true"));
        return ReportDto.from(reportService.resolve(principal.id(), id, body.get("note"), upheld));
    }

    @GetMapping("/pending-count")
    @PreAuthorize("hasAnyRole('MODERATOR','ADMIN')")
    public Map<String, Long> pendingCount() {
        return Map.of("pending", reportService.pendingCount());
    }
}