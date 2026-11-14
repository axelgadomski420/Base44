import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Camera, Coins, ImagePlus, LogOut, MapPin, Pencil, Trash2 } from "lucide-react";
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
  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState("listings");
  const [uploading, setUploading] = useState("");
  const [form, setForm] = useState({ display_name: "", kennel_name: "", city: "", bio: "" });
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

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
    base44.entities.Listing.filter({ seller_id: profile.user_id }, { sort: "-created_date", limit: 24 }).then(
      (page) => setListings(page.items ?? [])
    );
    base44.entities.Pet.filter({ owner_id: profile.user_id }, { limit: 24 }).then((page) =>
      setPets(page.items ?? [])
    );
    base44.entities.Post.filter({ author_id: profile.user_id }, { sort: "-created_date", limit: 24 }).then(
      (page) => setPosts(page.items ?? [])
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
    try {
      const updated = await base44.entities.Profile.update(profile.id, {
        ...form,
        city: form.city || profile.city,
      });
      setProfile(updated);
      setEditing(false);
      toast.success(t("create.success"));
      reload();
    } catch (err) {
      toast.error(err?.message ?? "Nie udało się zapisać");
    }
  };

  const uploadMedia = async (file, field) => {
    if (!profile || !file) return;
    setUploading(field);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const updated = await base44.entities.Profile.update(profile.id, { [field]: file_url });
      setProfile(updated);
      toast.success(field === "avatar_url" ? "Awatar zaktualizowany" : "Tło zaktualizowane");
      reload();
    } catch (err) {
      toast.error(err?.message ?? "Upload nie powiódł się");
    } finally {
      setUploading("");
    }
  };

  const deleteListing = async (id) => {
    if (!confirm("Usunąć ogłoszenie?")) return;
    try {
      await base44.entities.Listing.delete(id);
      setListings((prev) => prev.filter((item) => item.id !== id));
      toast.success("Usunięto ogłoszenie");
    } catch (err) {
      toast.error(err?.message ?? "Nie udało się usunąć");
    }
  };

  const deletePost = async (id) => {
    if (!confirm("Usunąć post?")) return;
    try {
      await base44.entities.Post.delete(id);
      setPosts((prev) => prev.filter((item) => item.id !== id));
      toast.success("Usunięto post");
    } catch (err) {
      toast.error(err?.message ?? "Nie udało się usunąć");
    }
  };

  const isBreeder = profile?.account_type === "breeder";

  return (
    <div>
      <TopBar />
      <div className="px-4 pb-12 pt-6 lg:px-8">
        {/* Cover */}
        <div className="relative mb-4 h-28 overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-violet/30 via-background to-aura/20 sm:h-36">
          {profile?.cover_url && (
            <Image src={profile.cover_url} alt="Tło" className="h-full w-full object-cover" />
          )}
          <button
            type="button"
            disabled={!!uploading}
            onClick={() => coverInputRef.current?.click()}
            className="absolute bottom-2 right-2 flex items-center gap-1 rounded-xl bg-black/50 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-white backdrop-blur"
          >
            <ImagePlus className="h-3 w-3" />
            {uploading === "cover_url" ? "…" : "Tło"}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMedia(file, "cover_url");
              e.target.value = "";
            }}
          />
        </div>

        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <span className="rounded-full bg-gradient-to-br from-violet to-aura p-[2px]">
              <span className="block rounded-full bg-background p-1">
                <Image
                  src={profile?.avatar_url}
                  alt={profile?.display_name ?? "Profil"}
                  className="h-20 w-20 rounded-full object-cover"
                />
              </span>
            </span>
            <button
              type="button"
              disabled={!!uploading}
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-border/70 bg-card text-muted-foreground shadow"
              aria-label="Zmień awatar"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMedia(file, "avatar_url");
                e.target.value = "";
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1.5 font-display text-2xl">
              <span className="truncate">{profile?.kennel_name || profile?.display_name || user?.full_name}</span>
              {profile?.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-aura" />}
            </h1>
            <p className="text-[11px] text-muted-foreground">{profile?.handle || "—"}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              {isBreeder ? "Hodowca" : "Użytkownik"}
              {profile?.verified ? " · zweryfikowany" : ""}
            </p>
            {profile?.city && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" /> {profile.city}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span>
                <b className="text-foreground">{formatNumber(profile?.followers ?? 0)}</b> {t("profile.followers")}
              </span>
              <span>
                <b className="text-foreground">{listings.length}</b> {t("profile.listings")}
              </span>
              <span>
                <b className="text-foreground">{pets.length}</b> {t("profile.pets")}
              </span>
              <span>
                <b className="text-foreground">{posts.length}</b> posty
              </span>
            </div>
            {isBreeder && (
              <Link to="/verify" className="mt-2 inline-block text-[10px] uppercase tracking-widest text-aura">
                {profile?.verified ? "Odznaka hodowcy" : "Zweryfikuj hodowlę"} →
              </Link>
            )}
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

        {(wallet?.badges?.length > 0 || profile?.verified) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {profile?.verified && (
              <span className="rounded-full border border-aura/40 bg-aura/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-aura">
                Zweryfikowany hodowca
              </span>
            )}
            {(wallet?.badges ?? []).map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-aura/40 bg-aura/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-aura"
              >
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* Activity tabs */}
        <div className="mt-6 flex gap-2">
          {[
            { id: "listings", label: t("profile.listings") },
            { id: "pets", label: t("profile.pets") },
            { id: "posts", label: "Posty" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                tab === item.id ? "bg-foreground text-background" : "border border-border/70 text-muted-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "listings" && (
          <section className="mt-4">
            {listings.length === 0 ? (
              <button
                type="button"
                onClick={() => navigate({ to: "/create" })}
                className="mt-1 w-full rounded-[var(--radius)] border border-dashed border-border/70 py-8 text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
              >
                {t("nav.add")}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {listings.map((listing) => (
                  <div key={listing.id} className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/60">
                    <Link to="/listings/$id" params={{ id: listing.id }}>
                      <Image
                        src={listing.image_urls?.[0]}
                        alt={listing.title}
                        className="aspect-square w-full object-cover"
                      />
                      <p className="truncate p-2 text-[11px]">{listing.title}</p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => deleteListing(listing.id)}
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                      aria-label="Usuń"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "pets" && (
          <section className="mt-4">
            {pets.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">{t("profile.noPets")}</p>
            ) : (
              <ul className="space-y-2">
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
        )}

        {tab === "posts" && (
          <section className="mt-4">
            {posts.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Brak postów.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {posts.map((post) => (
                  <div key={post.id} className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/60">
                    <Image
                      src={post.image_url || post.video_url}
                      alt={post.caption}
                      className="aspect-square w-full object-cover"
                    />
                    <p className="line-clamp-2 p-2 text-[10px] text-muted-foreground">{post.caption}</p>
                    <button
                      type="button"
                      onClick={() => deletePost(post.id)}
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                      aria-label="Usuń"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

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
