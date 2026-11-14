export const GAMES = [
  {
    id: "2048",
    label: "PURRE 2048",
    tagline: "Łącz kafelki, buduj serię",
    accent: "from-violet/25 to-aura/10",
  },
  {
    id: "memory",
    label: "PURRE Memory",
    tagline: "Znajdź pary zwierzaków",
    accent: "from-aura/20 to-violet/10",
  },
  {
    id: "quiz",
    label: "PURRE Quiz",
    tagline: "Wiedza o rasach i hodowli",
    accent: "from-violet/20 to-chart-4/10",
  },
  {
    id: "snake",
    label: "PURRE Snake",
    tagline: "Zbieraj smaczki, nie zjadaj ogona",
    accent: "from-aura/25 to-violet/10",
  },
  {
    id: "reaction",
    label: "PURRE Reflex",
    tagline: "Kliknij, gdy rozbłyśnie aurora",
    accent: "from-chart-4/20 to-aura/10",
  },
  {
    id: "whack",
    label: "PURRE Whack",
    tagline: "Łapki w norkach — 20 sekund",
    accent: "from-violet/20 to-aura/15",
  },
  {
    id: "slide",
    label: "PURRE Slide",
    tagline: "Ułóż łapę z kafelków",
    accent: "from-aura/15 to-violet/20",
  },
];

export const GAME_CAPS = {
  "2048": 100000,
  memory: 1200,
  quiz: 800,
  puzzle: 3000,
  snake: 5000,
  reaction: 2000,
  whack: 4000,
  slide: 2500,
};
export const GAME_DIVISOR = {
  "2048": 10,
  memory: 5,
  quiz: 8,
  puzzle: 6,
  snake: 8,
  reaction: 6,
  whack: 8,
  slide: 6,
};
export const DAILY_TARGETS = {
  "2048": 800,
  memory: 400,
  quiz: 500,
  puzzle: 600,
  snake: 200,
  reaction: 900,
  whack: 200,
  slide: 500,
};
export const DAILY_BONUS = 120;

export function dailyGame(dateStr) {
  const seed = dateStr.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const ids = ["2048", "memory", "quiz", "snake", "reaction", "whack", "slide"];
  return ids[seed % ids.length];
}

export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function dailyTarget(gameId) {
  return DAILY_TARGETS[gameId] ?? 500;
}
