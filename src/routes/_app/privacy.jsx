import { createFileRoute, Link } from "@tanstack/react-router";
import TopBar from "@/components/layout/TopBar";

export const Route = createFileRoute("/_app/privacy")({
  head: () => ({ meta: [{ title: "PURRE PETS — Polityka prywatności" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div>
      <TopBar title="Prywatność" />
      <div className="mx-auto max-w-2xl px-4 py-8 lg:px-8">
        <h1 className="font-display text-3xl">
          <span className="aura-text">Polityka prywatności</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Ostatnia aktualizacja: listopad 2026</p>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Administratorem danych osobowych jest operator platformy PURRE PETS (purrepets.pl).
            Przetwarzamy dane w celu świadczenia usług marketplace, społeczności, płatności (PURRE Coins / Stripe)
            oraz zapewnienia bezpieczeństwa serwisu.
          </p>
          <h2 className="pt-2 text-base font-semibold text-foreground">Jakie dane zbieramy</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>dane konta: e-mail, hasło (hash), imię / nazwa wyświetlana</li>
            <li>profil: miasto, bio, zdjęcia, dane hodowli</li>
            <li>treści użytkownika: ogłoszenia, posty, wiadomości, nagrania</li>
            <li>dane techniczne: logi, adres IP, pliki cookies</li>
            <li>dane płatności: identyfikatory sesji Stripe (bez pełnych numerów kart)</li>
          </ul>
          <h2 className="pt-2 text-base font-semibold text-foreground">Podstawa prawna</h2>
          <p>Art. 6 ust. 1 lit. a, b i f RODO — zgoda, wykonanie umowy oraz prawnie uzasadniony interes (bezpieczeństwo, analityka).</p>
          <h2 className="pt-2 text-base font-semibold text-foreground">Twoje prawa</h2>
          <p>
            Masz prawo dostępu, sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia danych oraz wniesienia
            skargi do PUODO. Kontakt: poprzez formularz w aplikacji lub e-mail podany w regulaminie.
          </p>
          <h2 className="pt-2 text-base font-semibold text-foreground">Cookies</h2>
          <p>
            Używamy niezbędnych cookies sesyjnych oraz opcjonalnych narzędzi analitycznych. Zgodę możesz wyrazić lub
            wycofać w banerze RODO (zapis w localStorage).
          </p>
        </div>

        <Link to="/terms" className="mt-8 inline-block text-[11px] uppercase tracking-widest text-aura">
          Regulamin →
        </Link>
      </div>
    </div>
  );
}
