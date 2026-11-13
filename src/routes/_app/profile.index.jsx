import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Coins, LogOut, MapPin, Pencil } from "lucide-react";
import { toast } from "sonner";
import TopBar from "@/components/layout/TopBar";
import ThemeLangMenu from "@/components/layout/ThemeLangMenu";
import { Image } from "@/components/ui/image";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useI18n } from "@/lib/i18n";
import { useProfile, ensureProfile } from "@/lib/useProfile";
import { useWallet } from "@/lib/useWallet";
import { CITY_NAMES } from "@/lib/geo";
import { formatNumber, levelFor } from "@/lib/format";

export const Route = createFileRoute("/_app/profile/")({
  ssr: false,
  head: () => ({ meta: [{ title: "PURRE PETS — profil" }] }),
  component: OwnProfilePage,
});

function OwnProfilePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth, navigateToLogin, logout } = useAuth();
  const { profile, reload, setProfile } = useProfile();
  const { coins, xp, level, wallet } = useWallet();
  const [listings, setListings] = useState([]);
  const [pets, setPets] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ display_name: "", kennel_name: "", city: "", bio: "" });

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && user && !profile) {
      ensureProfile(user).then((created) => setProfile(created));
    }
  }, [isLoadingAuth, isAuthenticated, user, profile, setProfile]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      display_name: profile.display_name ?? "",
      kennel_name: profile.kennel_name ?? "",
      city: profile.city ?? "",
      bio: profile.bio ?? "",
    });
    base44.entities.Listing.filter({ seller_id: profile.user_id }, { sort: "-created_date", limit: 12 }).then(
      (page) => setListings(page.items ?? [])
    );
    base44.entities.Pet.filter({ owner_id: profile.user_id }, { limit: 12 }).then((page) =>
      setPets(page.items ?? [])
    );
  }, [profile]);

  if (isLoadingAuth) {
    return <div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <TopBar />
        <div className="px-4 py-16 text-center">
          <h1 className="font-display text-3xl">{t("auth.welcome")}</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{t("auth.signInHint")}</p>
          <button
            type="button"
            onClick={navigateToLogin}
            className="btn-aura mt-6 rounded-xl px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em]"
          >
            {t("common.login")}
          </button>
        </div>
      </div>
    );
  }

  const save = async () => {
    if (!profile) return;
    const updated = await base44.entities.Profile.update(profile.id, {
      ...form,
      city: form.city || profile.city,
    });
    setProfile(updated);
    setEditing(false);
    toast.success(t("create.success"));
    reload();
  };

  return (
    <div>
      <TopBar />
      <div className="px-4 pb-12 pt-6 lg:px-8">
        <div className="flex items-start gap-4">
          <span className="rounded-full bg-gradient-to-br from-violet to-aura p-[2px]">
            <span className="block rounded-full bg-background p-1">
              <Image
                src={profile?.avatar_url}
                alt={profile?.display_name ?? "Profil"}
                className="h-20 w-20 rounded-full object-cover"
              />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1.5 font-display text-2xl">
              <span className="truncate">{profile?.kennel_name || profile?.display_name || user?.full_name}</span>
              {profile?.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-aura" />}
            </h1>
            <p className="text-[11px] text-muted-foreground">{profile?.handle || "—"}</p>
            {profile?.city && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" /> {profile.city}
              </p>
            )}
            <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>
                <b className="text-foreground">{formatNumber(profile?.followers ?? 0)}</b> {t("profile.followers")}
              </span>
              <span>
                <b className="text-foreground">{listings.length}</b> {t("profile.listings")}
              </span>
              <span>
                <b className="text-foreground">{pets.length}</b> {t("profile.pets")}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ThemeLangMenu />
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              className="flex items-center gap-1 rounded-xl border border-border/70 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
            >
              <Pencil className="h-3 w-3" /> {t("profile.editProfile")}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[var(--radius)] border border-border/70 bg-gradient-to-br from-violet/20 to-aura/10 p-3">
            <p className="text-[9px] uppercase tracking-[0.24em] text-muted-foreground">{t("arcade.coinsBalance")}</p>
            <p className="mt-1 flex items-center gap-1.5 font-display text-xl">
              <Coins className="h-4 w-4 text-aura" /> {formatNumber(coins)}
            </p>
            <Link to="/rewards" className="mt-1 inline-block text-[10px] uppercase tracking-widest text-aura">
              {t("arcade.rewards")} →
            </Link>
          </div>
          <div className="rounded-[var(--radius)] border border-border/70 bg-card/60 p-3">
            <p className="text-[9px] uppercase tracking-[0.24em] text-muted-foreground">{t("common.level")}</p>
            <p className="mt-1 font-display text-xl">{levelFor(xp)}</p>
            <p className="text-[10px] text-muted-foreground">{formatNumber(xp)} XP</p>
          </div>
        </div>

        {editing && (
          <div className="mt-4 space-y-2 rounded-[var(--radius)] border border-border/70 bg-card/60 p-4">
            {[
              { key: "display_name", label: "Nazwa wyświetlana" },
              { key: "kennel_name", label: "Nazwa hodowli" },
              { key: "bio", label: t("profile.about") },
            ].map((field) => (
              <label key={field.key} className="block">
                <span className="mb-1 block text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  {field.label}
                </span>
                <input
                  value={form[field.key]}
                  onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  className="w-full rounded-xl border border-border/70 bg-background/40 px-3 py-2 text-sm outline-none focus:border-violet/60"
                />
              </label>
            ))}
            <label className="block">
              <span className="mb-1 block text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                {t("create.city")}
              </span>
              <select
                value={form.city}
                onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                className="w-full rounded-xl border border-border/70 bg-background/40 px-3 py-2 text-sm outline-none"
              >
                <option value="" className="bg-popover">—</option>
                {CITY_NAMES.map((name) => (
                  <option key={name} value={name} className="bg-popover">
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={save}
              className="btn-aura mt-1 w-full rounded-xl py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em]"
            >
              {t("common.save")}
            </button>
          </div>
        )}

        {wallet?.badges?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {wallet.badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-aura/40 bg-aura/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-aura"
              >
                {badge}
              </span>
            ))}
          </div>
        )}

        <section className="mt-6">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{t("profile.listings")}</h2>
          {listings.length === 0 ? (
            <button
              type="button"
              onClick={() => navigate({ to: "/create" })}
              className="mt-3 w-full rounded-[var(--radius)] border border-dashed border-border/70 py-8 text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
            >
              {t("nav.add")}
            </button>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {listings.map((listing) => (
                <Link
                  key={listing.id}
                  to="/listings/$id"
                  params={{ id: listing.id }}
                  className="overflow-hidden rounded-2xl border border-border/70 bg-card/60"
                >
                  <Image
                    src={listing.image_urls?.[0]}
                    alt={listing.title}
                    className="aspect-square w-full object-cover"
                  />
                  <p className="truncate p-2 text-[11px]">{listing.title}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{t("profile.pets")}</h2>
          {pets.length === 0 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">{t("profile.noPets")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {pets.map((pet) => (
                <li key={pet.id} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/60 p-2.5">
                  <Image src={pet.photos?.[0]} alt={pet.name} className="h-11 w-11 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{pet.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {pet.breed || pet.species} {pet.pedigree ? "· rodowód" : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <button
          type="button"
          onClick={() => logout()}
          className="mt-8 flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" /> {t("common.logout")}
        </button>
      </div>
    </div>
  );
}
