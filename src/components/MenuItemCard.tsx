"use client";
import { MenuItem } from "@/types/menu";
import Image from "next/image";

type MenuItemCardProps = {
  item: MenuItem;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
};

export function MenuItemCard({ item, isFavorite, onToggleFavorite }: MenuItemCardProps) {
  return (
    <article className="group relative rounded-xl border border-white/8 bg-white/2 p-4 backdrop-blur-sm transition-colors hover:border-white/20">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br from-white/10 to-white/0 grid place-items-center">
          <Image src="/pumpkin.svg" alt="pumpkin" width={28} height={28} className="opacity-90" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate text-[16px] font-semibold tracking-wide text-white">{item.name}</h3>
            <button
              aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
              onClick={() => onToggleFavorite(item.id)}
              className={`grid h-8 w-8 place-items-center rounded-md border transition-colors ${
                isFavorite ? "border-[var(--color-neon)] bg-[var(--color-neon)]/10" : "border-white/10 hover:border-white/20"
              }`}
            >
              <Image
                src="/skull.svg"
                alt="favorite"
                width={16}
                height={16}
                className={isFavorite ? "opacity-100" : "opacity-70"}
              />
            </button>
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] text-white/80">{item.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="rounded-md border border-white/12 bg-white/5 px-2 py-0.5 text-white/90">{item.category}</span>
            <span className="rounded-md border border-white/12 bg-white/5 px-2 py-0.5 text-white/90">{item.strength}</span>
            {!item.isAlcoholic && (
              <span className="rounded-md border border-white/12 bg-white/5 px-2 py-0.5 text-white/90">Zero Proof</span>
            )}
            <span className="ml-auto text-[13px] font-semibold text-white tracking-wide">
              ${item.priceUsd.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}



