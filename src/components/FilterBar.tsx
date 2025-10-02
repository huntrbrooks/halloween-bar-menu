"use client";
import { StrengthLevel } from "@/types/menu";

type FilterBarProps = {
  search: string;
  onSearch: (v: string) => void;
  strength: StrengthLevel | "All";
  onStrength: (v: StrengthLevel | "All") => void;
  showAlcoholicOnly: boolean;
  onAlcoholicOnly: (v: boolean) => void;
  showFavoritesOnly: boolean;
  onFavoritesOnly: (v: boolean) => void;
};

export function FilterBar({
  search,
  onSearch,
  strength,
  onStrength,
  showAlcoholicOnly,
  onAlcoholicOnly,
  showFavoritesOnly,
  onFavoritesOnly,
}: FilterBarProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] items-center">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search potions, bites, spirits..."
        className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder-white/50 outline-none ring-0 focus:border-white/25"
      />
      <select
        value={strength}
        onChange={(e) => onStrength(e.target.value as StrengthLevel | "All")}
        className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-[14px] text-white outline-none focus:border-white/25"
      >
        <option value="All">All Strengths</option>
        <option value="Light">Light</option>
        <option value="Medium">Medium</option>
        <option value="Strong">Strong</option>
      </select>
      <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 text-[14px] text-white">
        <input
          type="checkbox"
          checked={showAlcoholicOnly}
          onChange={(e) => onAlcoholicOnly(e.target.checked)}
          className="accent-[var(--color-neon)]"
        />
        Alcoholic only
      </label>
      <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 text-[14px] text-white">
        <input
          type="checkbox"
          checked={showFavoritesOnly}
          onChange={(e) => onFavoritesOnly(e.target.checked)}
          className="accent-[var(--color-neon)]"
        />
        Favorites only
      </label>
    </div>
  );
}


