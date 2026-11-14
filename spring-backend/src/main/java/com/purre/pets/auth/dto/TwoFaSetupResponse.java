package com.purre.pets.auth.dto;

/** Sekret TOTP do zeskanowania / wpisania ręcznie w aplikacji uwierzytelniającej. */
public record TwoFaSetupResponse(String secret, String otpauthUri) {}