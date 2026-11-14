package com.purre.pets;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.configuration.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(AppProperties.class)
public class PurrePetsApplication {
    public static void main(String[] args) {
        SpringApplication.run(PurrePetsApplication.class, args);
    }
}