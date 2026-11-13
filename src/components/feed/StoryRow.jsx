import { BadgeCheck } from "lucide-react";
import { Image } from "@/components/ui/image";
import { useI18n } from "@/lib/i18n";

export default function StoryRow({ breeders = [] }) {
  const { t } = useI18n();
  return (
    <section className="mb-6">
      <p className="mb-3 text-[10px] uppercase tracking-[0.34em] text-muted-foreground">
        {t("feed.stories")}
      </p>
      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
        {breeders.map((breeder) => (
          <div key={breeder.id} className="flex w-[74px] shrink-0 flex-col items-center gap-2">
            <span className="rounded-full bg-gradient-to-br from-violet via-aura to-violet p-[2px]">
              <span className="block rounded-full bg-background p-[2px]">
                <Image
                  src={breeder.avatar}
                  alt={breeder.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              </span>
            </span>
            <span className="flex items-center gap-0.5 text-center text-[10px] leading-tight text-muted-foreground">
              <span className="line-clamp-2">{breeder.handle}</span>
              {breeder.verified && <BadgeCheck className="h-3 w-3 shrink-0 text-aura" />}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
