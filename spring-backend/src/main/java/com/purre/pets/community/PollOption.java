package com.purre.pets.community;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "poll_options")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PollOption {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(nullable = false, length = 200)
    private String label;

    @Column(nullable = false)
    private int position;
}
