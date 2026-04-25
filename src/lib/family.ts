// Family code generator — six-word phrase, e.g. "warm-river-cedar-stone-rose-amber".
// Curated word list of evocative, family-safe nouns/adjectives. ~80 words ×
// 6 positions ≈ 2.6×10^11 combinations, plenty for the demo.

const WORDS = [
  "warm", "amber", "river", "cedar", "stone", "rose", "linen", "honey",
  "summer", "winter", "olive", "sage", "harvest", "willow",
  "garden", "kettle", "lantern", "meadow", "north", "south", "morning",
  "twilight", "kitchen", "porch", "well", "hearth", "thyme",
  "apple", "pear", "almond", "walnut", "maple", "birch",
  "cotton", "linen", "wool", "paper", "iron", "copper", "salt",
  "bread", "bowl", "ladle", "spoon", "thread", "needle", "stitch",
  "patch", "window", "doorway", "memory", "letter", "story", "lullaby",
  "blessing", "blossom", "petal", "rain",
  "wind", "valley", "hill", "field", "pasture", "orchard",
  "table", "chair", "lamp", "candle", "ember", "spark", "ash", "frost",
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
