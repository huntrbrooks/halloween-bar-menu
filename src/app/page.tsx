"use client";
import { useMemo, useState } from "react";
import { menuItems } from "@/data/menu";
import { MenuItem } from "@/types/menu";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { MenuItemCard } from "@/components/MenuItemCard";
import { NeonButton } from "@/components/NeonButton";
import { FilterBar } from "@/components/FilterBar";

export default function Home() {
  const [search, setSearch] = useState("");
  const [strength, setStrength] = useState<"All" | MenuItem["strength"]>("All");
  const [alcoholicOnly, setAlcoholicOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useLocalStorage<string[]>("favorites", []);

  const categories = useMemo(
    () => Array.from(new Set(menuItems.map((m) => m.category))),
    []
  );
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filtered = useMemo(() => {
    return menuItems.filter((m) => {
      if (activeCategory !== "All" && m.category !== activeCategory) return false;
      if (strength !== "All" && m.strength !== strength) return false;
      if (alcoholicOnly && !m.isAlcoholic) return false;
      if (favoritesOnly && !favoriteIds.includes(m.id)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${m.name} ${m.description} ${m.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activeCategory, strength, alcoholicOnly, favoritesOnly, favoriteIds, search]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/pumpkin.svg" alt="pumpkin" className="h-8 w-8" />
          <h1 className="text-[22px] font-extrabold tracking-wider text-white">
            The Midnight Coven
          </h1>
        </div>
        <NeonButton label="Order at the Bar" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })} />
      </header>

      <nav className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveCategory("All")}
          className={`rounded-full border px-3 py-1.5 text-[13px] ${
            activeCategory === "All"
              ? "border-[var(--color-neon)] bg-[var(--color-neon)]/10 text-white"
              : "border-white/10 text-white/80 hover:border-white/20"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full border px-3 py-1.5 text-[13px] ${
              activeCategory === cat
                ? "border-[var(--color-neon)] bg-[var(--color-neon)]/10 text-white"
                : "border-white/10 text-white/80 hover:border-white/20"
            }`}
          >
            {cat}
          </button>
        ))}
      </nav>

      <FilterBar
        search={search}
        onSearch={setSearch}
        strength={strength}
        onStrength={setStrength}
        showAlcoholicOnly={alcoholicOnly}
        onAlcoholicOnly={setAlcoholicOnly}
        showFavoritesOnly={favoritesOnly}
        onFavoritesOnly={setFavoritesOnly}
      />

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {filtered.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            isFavorite={favoriteIds.includes(item.id)}
            onToggleFavorite={toggleFavorite}
          />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-white/70">
            No items match your filters.
          </p>
        )}
      </section>

      <footer className="mt-12 flex items-center justify-center">
        <p className="text-white/50 text-[13px]">Happy Haunting • Open till dawn</p>
      </footer>
    </div>
  );
}
