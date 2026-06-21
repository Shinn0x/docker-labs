package com.portfolio.catalog;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Product catalog. Other services (e.g. order-service) call this over the
 * internal Docker network to validate products and look up prices.
 */
@RestController
@RequestMapping("/products")
public class ProductController {

    public record Product(int id, String name, double price) {}

    private static final List<Product> PRODUCTS = List.of(
        new Product(1, "Mechanical Keyboard", 89.99),
        new Product(2, "27\" 4K Monitor", 329.00),
        new Product(3, "USB-C Docking Station", 149.50),
        new Product(4, "Noise-cancelling Headphones", 199.99)
    );

    @GetMapping
    public List<Product> all() {
        return PRODUCTS;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> byId(@PathVariable int id) {
        return PRODUCTS.stream()
            .filter(p -> p.id() == id)
            .findFirst()
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
