import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { BadgeCheck, CalendarDays, Dna, MapPin, User } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import { Image } from "@/components/ui/image";
import { base44 } from "@/api/base44Client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/pets/$id")({
  head: () => ({ meta: [{ title: "PURRE PETS — profil zwierzaka" }] }),
  component: PetProfilePage,
});

function petAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 1) return "mniej niż miesiąc";
  if (months < 12) return `${months} ${months === 1 ? "miesiąc" : months < 5 ? "miesiące" : "miesięcy"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yLabel = `${years} ${years === 1 ? "rok" : years < 5 ? "lata" : "lat"}`;
  return rest ? `${yLabel} ${rest} mies.` : yLabel;
}

const SPECIES_LABEL = { dog: "Pies", cat: "Kot" };

function PetProfilePage() {
  const { id } = useParams({ from: "/_app/pets/$id" });
  const { t } = useI18n();
  const [pet, setPet] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    base44.entities.Pet.get(id)
      .then(async (record) => {
        if (!alive) return;
        setPet(record);
        if (record?.owner_id) {
          try {
            const page = await base44.entities.Profile.filter({ user_id: record.owner_id }, { limit: 1 });
            if (alive) setOwner(page.items?.[0] ?? null);
          } catch {
            // profil właściciela opcjonalny — strona zwierzaka działa bez niego
          }
        }
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) return (<div><TopBar /><div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div></div>);
  if (!pet) return (<div><TopBar /><div className="p-6 text-sm text-muted-foreground">{t("common.empty")}</div></div>);

  const photos = (pet.photos ?? []).filter(Boolean);
  const age = petAge(pet.birth_date);
  const facts = [
    pet.species && { Icon: Dna, label: SPECIES_LABEL[pet.species] ?? pet.species },
    pet.breed && { Icon: BadgeCheck, label: pet.breed },
    pet.color && { Icon: Dna, label: `Umaszczenie: ${pet.color}` },
    age && { Icon: CalendarDays, label: `Wiek: ${age}` },
    pet.city && { Icon: MapPin, label: pet.city },
  ].filter(Boolean);

  return (
    <div>
      <TopBar />
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-6 lg:px-8">
        {/* Nagłówek wizytówki */}
        <div className="relative overflow-hidden rounded-[var(--radius)] border border-border/70 bg-card/60">
          <div className="absolute inset-0 bg-gradient-to-br from-violet/25 via-aura/10 to-transparent" />
          <div className="relative flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-end">
            <span className="rounded-full bg-gradient-to-br from-violet to-aura p-[2px]">
              <span className="block rounded-full bg-background p-1">
                <Image src={photos[0]} alt={pet.name} className="h-24 w-24 rounded-full object-cover sm:h-28 sm:w-28" />
              </span>
            </span>
            <div className="min-w-0 flex-1 text-center sm:pb-1 sm:text-left">
              <h1 className="flex items-center justify-center gap-2 font-display text-2xl sm:justify-start">
                <span className="truncate">{pet.name}</span>
                {pet.pedigree && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-violet/20 to-aura/20 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-aura">
                    <BadgeCheck className="h-3.5 w-3.5" /> Rodowód
                  </span>
                )}
              </h1>
              {pet.owner_name && <p className="text-[11px] text-muted-foreground">Właściciel: {pet.owner_name}</p>}
            </div>
            {owner && (
              <Link
                to="/profile/$id"
                params={{ id: owner.id }}
                className="btn-aura flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
              >
                <User className="h-3.5 w-3.5" /> Profil właściciela
              </Link>
            )}
          </div>
        </div>

        {/* Podstawowe informacje */}
        {facts.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {facts.map(({ Icon, label }, i) => (
              <span key={i} className="flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-[11px] text-muted-foreground">
                <Icon className="h-3.5 w-3.5" /> {label}
              </span>
            ))}
          </div>
        )}

        {pet.bio && <p className="mt-4 whitespace-pre-line text-[13px] leading-relaxed text-foreground/85">{pet.bio}</p>}

        {/* Galeria */}
        {photos.length > 0 && (
          <section className="mt-6">
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Galeria</h2>
            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {photos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-xl border border-border/70">
                  <Image src={url} alt={`${pet.name} — zdjęcie ${i + 1}`} className={cn("aspect-square w-full object-cover transition hover:scale-105", i === 0 && "col-span-2 row-span-2 aspect-auto")} />
                </a>
              ))}
            </div>
          </section>
        )}

        {photos.length === 0 && !pet.bio && facts.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">Ten zwierzak nie ma jeszcze uzupełnionego profilu.</p>
        )}
      </div>
    </div>
  );
}
