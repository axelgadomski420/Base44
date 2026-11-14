package com.purre.pets.verification;

/**
 * Typy dokumentów weryfikacji hodowcy.
 */
public enum DocType {
    KENNEL_REGISTRATION,   // numer/rejestracja hodowli (ZKwP, FCI, klub rasowy)
    ID_SCAN,               // skan dokumentu tożsamości
    REGISTRY_CERTIFICATE,  // zaświadczenie o wpisie do rejestru / legitymacja hodowcy
    LEGALITY_PROOF,        // inne dokumenty potwierdzające legalność
    HOUSING_PHOTO,         // zdjęcia warunków trzymania zwierząt (opcjonalne)
    RODO_CONSENT           // podpisana zgoda RODO
}