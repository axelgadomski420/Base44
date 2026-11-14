package com.purre.pets.arcade;

import java.util.Map;
import java.util.Optional;

/** Reguły anti-cheat per gra: limit wyniku, minimalny czas, tryb punktacji. */
public record GameRule(String id, int maxScore, int minDurationSeconds, boolean quizLike) {

    public static final Map<String, GameRule> ALL = Map.ofEntries(
            Map.entry("PURRE_2048", new GameRule("PURRE_2048", 200000, 20, false)),
            Map.entry("PURRE_MEMORY", new GameRule("PURRE_MEMORY", 5000, 15, false)),
            Map.entry("PURRE_QUIZ", new GameRule("PURRE_QUIZ", 50, 10, true)),
            Map.entry("PURRE_HEX", new GameRule("PURRE_HEX", 100000, 20, false)),
            Map.entry("PURRE_PUZZLE", new GameRule("PURRE_PUZZLE", 10000, 20, false)),
            Map.entry("PURRE_SNAKE", new GameRule("PURRE_SNAKE", 20000, 15, false)),
            Map.entry("PURRE_TETRIS", new GameRule("PURRE_TETRIS", 300000, 30, false)),
            Map.entry("PURRE_FLAPPY", new GameRule("PURRE_FLAPPY", 5000, 10, false)),
            Map.entry("PURRE_RUNNER", new GameRule("PURRE_RUNNER", 100000, 15, false)),
            Map.entry("PURRE_MATCH3", new GameRule("PURRE_MATCH3", 100000, 20, false)),
            Map.entry("PURRE_WORDLE", new GameRule("PURRE_WORDLE", 6, 10, true)),
            Map.entry("PURRE_TRIVIA", new GameRule("PURRE_TRIVIA", 50, 10, true)),
            Map.entry("PURRE_COLORING", new GameRule("PURRE_COLORING", 1000, 10, false)),
            Map.entry("PURRE_JUMP", new GameRule("PURRE_JUMP", 50000, 10, false)),
            Map.entry("PURRE_BUBBLE", new GameRule("PURRE_BUBBLE", 100000, 15, false))
    );

    public static Optional<GameRule> byId(String id) {
        GameRule rule = ALL.get(id);
        if (rule != null) return Optional.of(rule);
        return ALL.values().stream().filter(r -> r.id().equalsIgnoreCase(id)).findFirst();
    }
}