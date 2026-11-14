import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, Save } from "lucide-react";
import { toast } from "sonner";
import { base44, profileApi } from "@/api/base44Client";
import { cn } from "@/lib/utils";

/**
 * ProfileEditor — pełna edycja profilu: awatar, zdjęcie w tle, imię, bio,
 * miasto, nazwa hodowli. Zapis przez PATCH /api/profile/me, natychmiastowe
 * odświeżenie widoku po zapisie.
 */
export default function ProfileEditor({ onSaved, className }) {
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const avatarRef = useRef(null);
  const coverRef = useRef(null);

  useEffect(() => {
    profileApi.me().then(setProfile).catch(() => null);
  }, []);

  const upload = async (file) => {
    const up = await base44.integrations.Core.UploadPublicFile({ file });
    return up.file_url;
  };

  const pick = async (file, field) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await upload(file);
      setProfile((p) => ({ ...p, [field]: url }));
    } catch (err) {
      toast.error(err?.message ?? "Upload nie powiódł się");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const saved = await profileApi.update({
        display_name: profile.display_name,
        handle: profile.handle ?? undefined,
        kennel_name: profile.kennel_name ?? undefined,
        bio: profile.bio ?? undefined,
        city: profile.city ?? undefined,
        avatar_url: profile.avatar_url ?? undefined,
        cover_url: profile.cover_url ?? undefined,
        account_type: profile.account_type,
      });
      setProfile(saved);
      toast.success("Profil zaktualizowany");
      onSaved?.(saved);
    } catch (err) {
      toast.error(err?.message ?? "Nie udało się zapisać profilu");
    } finally {
      setBusy(false);
    }
  };

  if (!profile) return <div className="p-6 text-sm text-muted-foreground">Ładowanie profilu…</div>;

  const field = (label, key, type = "text") => (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</label>
      <input
        type={type}
        value={profile[key] ?? ""}
        onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
        className="h-11 w-full rounded-xl border border-border/60 bg-background/50 px-3 text-sm outline-none"
      />
    </div>
  );

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border/70 bg-card/50", className)}>
      <div className="relative h-36">
        {profile.cover_url ? (
          <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-violet/30 to-aura/20" />
        )}
        <button
          type="button"
          onClick={() => coverRef.current?.click()}
          className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-[10px] text-white"
        >
          <ImageIcon className="h-3 w-3" /> Zmień tło
        </button>
        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0], "cover_url"); e.target.value = ""; }} />

        <div className="absolute -bottom-8 left-4">
          <div className="relative">
            <img
              src={profile.avatar_url}
              alt=""
              className="h-20 w-20 rounded-full border-4 border-card object-cover"
            />
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-aura text-black"
              aria-label="Zmień awatar"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0], "avatar_url"); e.target.value = ""; }} />
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4 pt-12">
        {field("Nazwa wyświetlana", "display_name")}
        {field("Nazwa hodowli (opcjonalnie)", "kennel_name")}
        {field("Miasto", "city")}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Bio</label>
          <textarea
            value={profile.bio ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
            rows={3}
            className="w-full rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none"
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn-aura flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {busy ? "Zapisuję…" : "Zapisz profil"}
        </button>
      </div>
    </div>
  );
}
