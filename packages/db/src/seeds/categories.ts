/** The 18 NeetCode 150 sections (spec §4.2). `slug` is the stable key. */
export type SeedCategory = { name: string; slug: string };

export const categoriesSeed: SeedCategory[] = [
  { name: "Arrays & Hashing", slug: "arrays-hashing" },
  { name: "Two Pointers", slug: "two-pointers" },
  { name: "Sliding Window", slug: "sliding-window" },
  { name: "Stack", slug: "stack" },
  { name: "Binary Search", slug: "binary-search" },
  { name: "Linked List", slug: "linked-list" },
  { name: "Trees", slug: "trees" },
  { name: "Tries", slug: "tries" },
  { name: "Heap / Priority Queue", slug: "heap-priority-queue" },
  { name: "Backtracking", slug: "backtracking" },
  { name: "Graphs", slug: "graphs" },
  { name: "Advanced Graphs", slug: "advanced-graphs" },
  { name: "1D Dynamic Programming", slug: "1d-dynamic-programming" },
  { name: "2D Dynamic Programming", slug: "2d-dynamic-programming" },
  { name: "Greedy", slug: "greedy" },
  { name: "Intervals", slug: "intervals" },
  { name: "Math & Geometry", slug: "math-geometry" },
  { name: "Bit Manipulation", slug: "bit-manipulation" },
];
