import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import { Image } from "@/components/ui/image";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useI18n } from "@/lib/i18n";
import { CITY_NAMES } from "@/lib/geo";
import { ensureProfile, useProfile } from "@/lib/useProfile";
import { useWallet } from "@/lib/useWallet";
import { createListing, LISTING_COST, moderateListing } from "@/lib/server-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/_authed/create")({
  head: () => ({ meta: [{ title: "PURRE PETS — dodaj" }] }),
  component: CreatePage,
});

const TABS = [
  { id: "listing", labelKey: "create.listing", hintKey: "create.listingHint" },
  { id: "post", labelKey: "create.post", hintKey: "create.postHint" },
  { id: "pet", labelKey: "create.pet", hintKey: "create.petHint" },
];

function CreatePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const moderate = useServerFn(moderateListing);
  const create = useServerFn(createListing);
  const { profile, reload: reloadProfile } = useProfile();
  const { coins } = useWallet();

  const [tab, setTab] = useState("listing");
  const [busy, setBusy] = useState(false);
  const [breederBusy, setBreederBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [kind, setKind] = useState("sale");
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    city: "Warszawa",
    species: "dog",
    breed: "",
    age_months: "",
    postCaption: "",
    petName: "",
    petBirth: "",
    petBio: "",
  });

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      if (file.type.startsWith("video/")) {
        setVideoUrl(file_url);
      } else {
        setImageUrl(file_url);
      }
    } finally {
      setBusy(false);
    }
  };

  const becomeBreeder = async () => {
    setBreederBusy(true);
    try {
      const current = profile ?? (await ensureProfile(user));
      await base44.entities.Profile.update(current.id, { account_type: "breeder" });
      await reloadProfile();
      toast.success("Konto hodowcy aktywne — możesz dodawać ogłoszenia.");
    } catch (error) {
      toast.error(error?.message ?? "Nie udało się przełączyć konta");
    } finally {
      setBreederBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const profile = await ensureProfile(user);

      if (tab === "listing") {
        const { listing, cost } = await create({
          data: {
            kind,
            title: form.title,
            description: form.description,
            price: Number(form.price) || 0,
            species: form.species,
            breed: form.breed || undefined,
            age_months: Number(form.age_months) || undefined,
            city: form.city,
            image_urls: imageUrl ? [imageUrl] : [],
          },
        });
        if (cost > 0) toast.success(`Opublikowano — pobrano ${cost} PURRE coinów.`);

        toast.loading(t("create.moderation"), { id: "mod" });
        try {
          const result = await moderate({ data: { listing_id: listing.id } });
          toast.success(
            result.decision === "review" ? t("create.moderationReview") : t("create.moderationOk"),
            { id: "mod" }
          );
        } catch (error) {
          toast.error(error?.message ?? "Moderacja niedostępna", { id: "mod" });
        }
        navigate({ to: "/listings/$id", params: { id: listing.id } });
        return;
      }

      if (tab === "post") {
        await base44.entities.Post.create({
          author_id: user.id,
          author_name: profile?.kennel_name || profile?.display_name || user.full_name,
          author_handle: profile?.handle,
          author_avatar: profile?.avatar_url,
          author_verified: !!profile?.verified,
          city: form.city,
          breed: form.breed,
          caption: form.postCaption,
          image_url: videoUrl ? "" : imageUrl,
          video_url: videoUrl,
          tags: form.breed ? [form.breed.toLowerCase()] : [],
          likes: 0,
          comment_count: 0,
          status: "published",
        });
        toast.success(t("create.success"));
        navigate({ to: "/" });
        return;
      }

      await base44.entities.Pet.create({
        owner_id: user.id,
        owner_name: profile?.display_name || user.full_name,
        name: form.petName,
        species: form.species,
        breed: form.breed,
        birth_date: form.petBirth || undefined,
        bio: form.petBio,
        city: form.city,
        photos: imageUrl ? [imageUrl] : [],
        pedigree: true,
      });
      toast.success(t("create.success"));
      navigate({ to: "/profile" });
    } catch (error) {
      toast.error(error?.message ?? "Nie udało się zapisać");
    } finally {
      setBusy(false);
    }
  };

  const activeTab = TABS.find((item) => item.id === tab);

  return (
    <div>
      <TopBar />
      <div className="px-4 pb-12 pt-6 lg:px-8">
        <h1 className="font-display text-3xl">
          <span className="aura-text">{t("create.title")}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t(activeTab.hintKey)}</p>

        <div className="mt-5 flex gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-medium transition",
                tab === item.id
                  ? "bg-foreground text-background"
                  : "border border-border/70 text-muted-foreground hover:text-foreground"
              )}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3 rounded-[var(--radius)] border border-border/70 bg-card/60 p-4">
            {tab === "listing" && profile?.account_type !== "breeder" && (
              <div className="rounded-2xl border border-violet/40 bg-violet/10 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-violet">Tylko konto hodowcy</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                  Ogłoszenia dodają hodowle. Pierwsze ogłoszenie jest gratis, kolejne kosztują{" "}
                  {LISTING_COST} PURRE coinów.
                </p>
                <button
                  type="button"
                  onClick={becomeBreeder}
                  disabled={breederBusy}
                  className="btn-aura mt-3 w-full rounded-xl py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] disabled:opacity-60"
                >
                  {breederBusy ? "Przełączam…" : "Zostań hodowcą"}
                </button>
                <Link
                  to="/onboarding"
                  className="mt-2 block text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Uzupełnij dane hodowli
                </Link>
              </div>
            )}

            {tab === "listing" && profile?.account_type === "breeder" && (
              <>
                <div className="flex gap-2">
                  {["sale", "adoption"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setKind(option)}
                      className={cn(
                        "flex-1 rounded-xl border py-2 text-[11px] uppercase tracking-[0.18em] transition",
                        kind === option
                          ? "border-violet/70 bg-violet/10 text-foreground"
                          : "border-border/70 text-muted-foreground"
                      )}
                    >
                      {option === "sale" ? t("explore.listings") : t("explore.adoptions")}
                    </button>
                  ))}
                </div>
                <Field label={t("create.titleField")}>
                  <input value={form.title} onChange={set("title")} className={inputClass} placeholder="Szczeniaki golden retriever, rodzina B" />
                </Field>
                <Field label={t("create.description")}>
                  <textarea value={form.description} onChange={set("description")} rows={4} className={inputClass} placeholder="Rodowód, badania, warunki odbioru…" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("create.priceField")}>
                    <input value={form.price} onChange={set("price")} inputMode="numeric" className={inputClass} placeholder="3500" />
                  </Field>
                  <Field label={t("create.city")}>
                    <select value={form.city} onChange={set("city")} className={inputClass}>
                      {CITY_NAMES.map((name) => (
                        <option key={name} value={name} className="bg-popover">
                          {name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("create.species")}>
                    <select value={form.species} onChange={set("species")} className={inputClass}>
                      <option value="dog" className="bg-popover">Pies</option>
                      <option value="cat" className="bg-popover">Kot</option>
                    </select>
                  </Field>
                  <Field label={t("create.breed")}>
                    <input value={form.breed} onChange={set("breed")} className={inputClass} placeholder="Golden Retriever" />
                  </Field>
                </div>
                <Field label="Wiek (miesiące)">
                  <input value={form.age_months} onChange={set("age_months")} inputMode="numeric" className={inputClass} placeholder="3" />
                </Field>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Pierwsze ogłoszenie gratis · kolejne {LISTING_COST} PURRE coinów · masz {coins}{" "}
                  {coins === 1 ? "monetę" : "coinów"}.
                </p>
              </>
            )}

            {tab === "post" && (
              <>
                <Field label="Opis posta">
                  <textarea value={form.postCaption} onChange={set("postCaption")} rows={4} className={inputClass} placeholder="Co nowego u Twoich zwierzaków?" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("create.breed")}>
                    <input value={form.breed} onChange={set("breed")} className={inputClass} placeholder="Maine Coon" />
                  </Field>
                  <Field label={t("create.city")}>
                    <select value={form.city} onChange={set("city")} className={inputClass}>
                      {CITY_NAMES.map((name) => (
                        <option key={name} value={name} className="bg-popover">{name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </>
            )}

            {tab === "pet" && (
              <>
                <Field label="Imię zwierzaka">
                  <input value={form.petName} onChange={set("petName")} className={inputClass} placeholder="Luna" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("create.species")}>
                    <select value={form.species} onChange={set("species")} className={inputClass}>
                      <option value="dog" className="bg-popover">Pies</option>
                      <option value="cat" className="bg-popover">Kot</option>
                    </select>
                  </Field>
                  <Field label={t("create.breed")}>
                    <input value={form.breed} onChange={set("breed")} className={inputClass} placeholder="British Shorthair" />
                  </Field>
                </div>
                <Field label="Data urodzenia">
                  <input type="date" value={form.petBirth} onChange={set("petBirth")} className={inputClass} />
                </Field>
                <Field label={t("create.description")}>
                  <textarea value={form.petBio} onChange={set("petBio")} rows={3} className={inputClass} placeholder="Charakter, osiągnięcia, rodowód…" />
                </Field>
              </>
            )}

            {!(tab === "listing" && profile?.account_type !== "breeder") && (
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="btn-aura mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[11px] font-semibold uppercase tracking-[0.2em] disabled:opacity-60"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {busy ? t("create.publishing") : t("create.publish")}
              </button>
            )}
          </div>

          <div className="rounded-[var(--radius)] border border-border/70 bg-card/60 p-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{t("create.photos")}</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-dashed border-border/70">
              {videoUrl ? (
                <video src={videoUrl} className="aspect-square w-full object-cover" muted loop playsInline controls />
              ) : imageUrl ? (
                <Image src={imageUrl} alt="Podgląd" className="aspect-square w-full object-cover" />
              ) : (
                <div className="grid aspect-square w-full place-items-center text-muted-foreground">
                  <ImagePlus className="h-6 w-6" />
                </div>
              )}
            </div>
            <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-border/70 py-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition hover:text-foreground">
              {tab === "post" ? "Wgraj zdjęcie lub wideo" : t("create.uploadPhoto")}
              <input
                type="file"
                accept={tab === "post" ? "image/*,video/*" : "image/*"}
                onChange={upload}
                className="hidden"
              />
            </label>
            {tab === "post" && (
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                Wideo trafia do Holo Reels — pionowy feed jak na TikToku.
              </p>
            )}
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              Zdjęcia są publiczne (stored publicly — anyone with the link can open them), tak jak w
              każdym marketplace.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-border/70 bg-background/40 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-violet/60";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
