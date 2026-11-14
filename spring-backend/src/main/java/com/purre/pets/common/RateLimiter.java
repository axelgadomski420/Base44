package com.purre.pets.common;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Prosty sliding-window rate limiter (per proces). Docelowo Redis — wystarczający dla 1 OCPU / 6 GB RAM.
 */
@Component
public class RateLimiter {

    private final Map<String, Deque<Long>> buckets = new ConcurrentHashMap<>();

    public boolean allow(String key, int limit, long windowMillis) {
        long now = System.currentTimeMillis();
        Deque<Long> deque = buckets.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (deque) {
            while (!deque.isEmpty() && now - deque.peekFirst() > windowMillis) deque.pollFirst();
            if (deque.size() >= limit) return false;
            deque.addLast(now);
            return true;
        }
    }
}