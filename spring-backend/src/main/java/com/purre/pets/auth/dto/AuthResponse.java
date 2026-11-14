package com.purre.pets.auth.dto;

/**
 * Odpowiedź auth: accessToken + refreshToken (sesja) + user.
 * require2fa=true oznacza: konto z 2FA — powtórz login z kodem TOTP (pozostałe pola null).
 */
public record AuthResponse(String accessToken, String refreshToken, UserDto user, boolean require2fa) {}