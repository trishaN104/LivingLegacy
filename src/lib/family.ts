// Family code generator — six-word phrase, e.g. "warm-river-cedar-stone-rose-amber".
// Curated word list of evocative, family-safe nouns/adjectives. ~80 words ×
// 6 positions ≈ 2.6×10^11 combinations, plenty for the demo.

const WORDS = [
  "warm", "amber", "river", "cedar", "stone", "rose", "linen", "honey",
  "summer", "winter", "marigold", "olive", "sage", "harvest", "willow",
  "garden", "kettle", "lantern", "meadow", "north", "south", "morning",
  "twilight", "kitchen", "porch", "well", "hearth", "spice", "mango",
  "jasmine", "saffron", "pomegranate", "apricot", "almond", "cardamom",
  "tea", "cotton", "silk", "wool", "paper", "iron", "copper", "salt",
  "bread", "bowl", "ladle", "spoon", "thread", "needle", "stitch",
  "patch", "garden", "courtyard", "veranda", "balcony", "window",
  "doorway", "thread", "memory", "letter", "story", "carol", "lullaby",
  "blessing", "prayer", "harvest", "monsoon", "blossom", "petal", "rain",
  "wind", "river", "valley", "hill", "field", "pasture", "orchard",
  "kitchen", "table", "chair", "lamp", "candle", "ember", "spark",
];

export function generateFamilyCode(): string {
  const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];
  const words = new Set<string>();
  while (words.size < 6) words.add(pick());
  return Array.from(words).join("-");
}

export function isValidFamilyCode(code: string): boolean {
  const parts = code.trim().toLowerCase().split("-");
  if (parts.length !== 6) return false;
  return parts.every((p) => /^[a-z]+$/.test(p));
}
