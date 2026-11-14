package com.purre.pets.auth.dto;

public record AuthResponse(String accessToken, UserDto user) {}