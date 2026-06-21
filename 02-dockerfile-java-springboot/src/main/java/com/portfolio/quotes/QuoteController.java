package com.portfolio.quotes;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

/**
 * A tiny REST controller serving inspirational quotes.
 * The app is intentionally minimal — this project is about the Dockerfile.
 */
@RestController
@RequestMapping("/api/quotes")
public class QuoteController {

    private record Quote(int id, String text, String author) {}

    private static final List<Quote> QUOTES = List.of(
        new Quote(1, "Premature optimization is the root of all evil.", "Donald Knuth"),
        new Quote(2, "Simplicity is prerequisite for reliability.", "Edsger Dijkstra"),
        new Quote(3, "Make it work, make it right, make it fast.", "Kent Beck"),
        new Quote(4, "First, solve the problem. Then, write the code.", "John Johnson"),
        new Quote(5, "Containers are about deployment, not virtualization.", "Anonymous DevOps Engineer")
    );

    @GetMapping
    public List<Quote> all() {
        return QUOTES;
    }

    @GetMapping("/random")
    public Quote random() {
        return QUOTES.get(ThreadLocalRandom.current().nextInt(QUOTES.size()));
    }

    @GetMapping("/{id}")
    public Object byId(@PathVariable int id) {
        return QUOTES.stream()
            .filter(q -> q.id() == id)
            .findFirst()
            .map(q -> (Object) q)
            .orElse(Map.of("error", "quote not found", "id", id));
    }
}
