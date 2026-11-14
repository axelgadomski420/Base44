import { createFileRoute, Link } from "@tanstack/react-router";
import TopBar from "@/components/layout/TopBar";

export const Route = createFileRoute("/_app/terms")({
  head: () => ({ meta: [{ title: "PURRE PETS — Regulamin" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div>
      <TopBar title="Regulamin" />
      <div className="mx-auto max-w-2xl px-4 py-8 lg:px-8">
        <h1 className="font-display text-3xl">
          <span className="aura-text">Regulamin serwisu</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Ostatnia aktualizacja: listopad 2026</p>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Korzystając z platformy PURRE PETS akceptujesz niniejszy regulamin. Serwis łączy hodowców i osoby
            poszukujące zwierzaków: marketplace, social feed, wiadomości, wydarzenia i gry (PURRE Arcade).
          </p>
          <h2 className="pt-2 text-base font-semibold text-foreground">Konta</h2>
          <p>
            Konta dzielą się na użytkownika (enthusiast) oraz hodowcę (breeder). Hodowca może ubiegać się o weryfikację
            i odznakę. Zabronione jest podszywanie się, spam, treści nielegalne oraz handel poza zasadami platformy.
          </p>
          <h2 className="pt-2 text-base font-semibold text-foreground">Ogłoszenia i treści</h2>
          <p>
            Użytkownik ponosi odpowiedzialność za publikowane treści. Administrator i moderatorzy mogą ukrywać,
            archiwizować lub usuwać treści naruszające prawo lub regulamin.
          </p>
          <h2 className="pt-2 text-base font-semibold text-foreground">PURRE Coins</h2>
          <p>
            Wirtualna waluta do boostów, biletów i nagród. Coiny nie podlegają wypłacie na rachunek bankowy.
            Zakupy realizowane są przez Stripe.
          </p>
          <h2 className="pt-2 text-base font-semibold text-foreground">Zakazy</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>treści pornograficzne, nienawistne, wprowadzające w błąd</li>
            <li>oszustwa, kradzież tożsamości, phishing</li>
            <li>automatyzacja bez zgody (scraping, boty)</li>
          </ul>
          <h2 className="pt-2 text-base font-semibold text-foreground">Kontakt</h2>
          <p>Sprawy dotyczące konta, moderacji i RODO zgłaszaj przez panel pomocy w aplikacji.</p>
        </div>

        <Link to="/privacy" className="mt-8 inline-block text-[11px] uppercase tracking-widest text-aura">
          Polityka prywatności →
        </Link>
      </div>
    </div>
  );
}
