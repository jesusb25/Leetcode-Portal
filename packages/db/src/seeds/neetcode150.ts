/**
 * The full NeetCode 150 list (spec §8). Sourced from https://neetcode.io/roadmap.
 *
 * `category` must match a slug in `categories.ts`. `companies` is intentionally
 * left empty — accurate company tags aren't reliably sourceable offline and can be
 * backfilled later via the LeetCode metadata scraper.
 */

export type SeedProblem = {
  leetcodeId: number;
  title: string;
  url: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string; // must match a category slug
  companies: string[];
};

type Entry = [
  leetcodeId: number,
  title: string,
  slug: string,
  difficulty: SeedProblem["difficulty"],
  category: string,
];

const entries: Entry[] = [
  // --- Arrays & Hashing (9) ---
  [217, "Contains Duplicate", "contains-duplicate", "Easy", "arrays-hashing"],
  [242, "Valid Anagram", "valid-anagram", "Easy", "arrays-hashing"],
  [1, "Two Sum", "two-sum", "Easy", "arrays-hashing"],
  [49, "Group Anagrams", "group-anagrams", "Medium", "arrays-hashing"],
  [347, "Top K Frequent Elements", "top-k-frequent-elements", "Medium", "arrays-hashing"],
  [271, "Encode and Decode Strings", "encode-and-decode-strings", "Medium", "arrays-hashing"],
  [238, "Product of Array Except Self", "product-of-array-except-self", "Medium", "arrays-hashing"],
  [36, "Valid Sudoku", "valid-sudoku", "Medium", "arrays-hashing"],
  [128, "Longest Consecutive Sequence", "longest-consecutive-sequence", "Medium", "arrays-hashing"],

  // --- Two Pointers (5) ---
  [125, "Valid Palindrome", "valid-palindrome", "Easy", "two-pointers"],
  [167, "Two Sum II - Input Array Is Sorted", "two-sum-ii-input-array-is-sorted", "Medium", "two-pointers"],
  [15, "3Sum", "3sum", "Medium", "two-pointers"],
  [11, "Container With Most Water", "container-with-most-water", "Medium", "two-pointers"],
  [42, "Trapping Rain Water", "trapping-rain-water", "Hard", "two-pointers"],

  // --- Sliding Window (6) ---
  [121, "Best Time to Buy and Sell Stock", "best-time-to-buy-and-sell-stock", "Easy", "sliding-window"],
  [3, "Longest Substring Without Repeating Characters", "longest-substring-without-repeating-characters", "Medium", "sliding-window"],
  [424, "Longest Repeating Character Replacement", "longest-repeating-character-replacement", "Medium", "sliding-window"],
  [567, "Permutation in String", "permutation-in-string", "Medium", "sliding-window"],
  [76, "Minimum Window Substring", "minimum-window-substring", "Hard", "sliding-window"],
  [239, "Sliding Window Maximum", "sliding-window-maximum", "Hard", "sliding-window"],

  // --- Stack (7) ---
  [20, "Valid Parentheses", "valid-parentheses", "Easy", "stack"],
  [155, "Min Stack", "min-stack", "Medium", "stack"],
  [150, "Evaluate Reverse Polish Notation", "evaluate-reverse-polish-notation", "Medium", "stack"],
  [22, "Generate Parentheses", "generate-parentheses", "Medium", "stack"],
  [739, "Daily Temperatures", "daily-temperatures", "Medium", "stack"],
  [853, "Car Fleet", "car-fleet", "Medium", "stack"],
  [84, "Largest Rectangle in Histogram", "largest-rectangle-in-histogram", "Hard", "stack"],

  // --- Binary Search (7) ---
  [704, "Binary Search", "binary-search", "Easy", "binary-search"],
  [74, "Search a 2D Matrix", "search-a-2d-matrix", "Medium", "binary-search"],
  [875, "Koko Eating Bananas", "koko-eating-bananas", "Medium", "binary-search"],
  [153, "Find Minimum in Rotated Sorted Array", "find-minimum-in-rotated-sorted-array", "Medium", "binary-search"],
  [33, "Search in Rotated Sorted Array", "search-in-rotated-sorted-array", "Medium", "binary-search"],
  [981, "Time Based Key-Value Store", "time-based-key-value-store", "Medium", "binary-search"],
  [4, "Median of Two Sorted Arrays", "median-of-two-sorted-arrays", "Hard", "binary-search"],

  // --- Linked List (11) ---
  [206, "Reverse Linked List", "reverse-linked-list", "Easy", "linked-list"],
  [21, "Merge Two Sorted Lists", "merge-two-sorted-lists", "Easy", "linked-list"],
  [143, "Reorder List", "reorder-list", "Medium", "linked-list"],
  [19, "Remove Nth Node From End of List", "remove-nth-node-from-end-of-list", "Medium", "linked-list"],
  [138, "Copy List with Random Pointer", "copy-list-with-random-pointer", "Medium", "linked-list"],
  [2, "Add Two Numbers", "add-two-numbers", "Medium", "linked-list"],
  [141, "Linked List Cycle", "linked-list-cycle", "Easy", "linked-list"],
  [287, "Find the Duplicate Number", "find-the-duplicate-number", "Medium", "linked-list"],
  [146, "LRU Cache", "lru-cache", "Medium", "linked-list"],
  [23, "Merge k Sorted Lists", "merge-k-sorted-lists", "Hard", "linked-list"],
  [25, "Reverse Nodes in k-Group", "reverse-nodes-in-k-group", "Hard", "linked-list"],

  // --- Trees (15) ---
  [226, "Invert Binary Tree", "invert-binary-tree", "Easy", "trees"],
  [104, "Maximum Depth of Binary Tree", "maximum-depth-of-binary-tree", "Easy", "trees"],
  [543, "Diameter of Binary Tree", "diameter-of-binary-tree", "Easy", "trees"],
  [110, "Balanced Binary Tree", "balanced-binary-tree", "Easy", "trees"],
  [100, "Same Tree", "same-tree", "Easy", "trees"],
  [572, "Subtree of Another Tree", "subtree-of-another-tree", "Easy", "trees"],
  [235, "Lowest Common Ancestor of a Binary Search Tree", "lowest-common-ancestor-of-a-binary-search-tree", "Medium", "trees"],
  [102, "Binary Tree Level Order Traversal", "binary-tree-level-order-traversal", "Medium", "trees"],
  [199, "Binary Tree Right Side View", "binary-tree-right-side-view", "Medium", "trees"],
  [1448, "Count Good Nodes in Binary Tree", "count-good-nodes-in-binary-tree", "Medium", "trees"],
  [98, "Validate Binary Search Tree", "validate-binary-search-tree", "Medium", "trees"],
  [230, "Kth Smallest Element in a BST", "kth-smallest-element-in-a-bst", "Medium", "trees"],
  [105, "Construct Binary Tree from Preorder and Inorder Traversal", "construct-binary-tree-from-preorder-and-inorder-traversal", "Medium", "trees"],
  [124, "Binary Tree Maximum Path Sum", "binary-tree-maximum-path-sum", "Hard", "trees"],
  [297, "Serialize and Deserialize Binary Tree", "serialize-and-deserialize-binary-tree", "Hard", "trees"],

  // --- Tries (3) ---
  [208, "Implement Trie (Prefix Tree)", "implement-trie-prefix-tree", "Medium", "tries"],
  [211, "Design Add and Search Words Data Structure", "design-add-and-search-words-data-structure", "Medium", "tries"],
  [212, "Word Search II", "word-search-ii", "Hard", "tries"],

  // --- Heap / Priority Queue (7) ---
  [703, "Kth Largest Element in a Stream", "kth-largest-element-in-a-stream", "Easy", "heap-priority-queue"],
  [1046, "Last Stone Weight", "last-stone-weight", "Easy", "heap-priority-queue"],
  [973, "K Closest Points to Origin", "k-closest-points-to-origin", "Medium", "heap-priority-queue"],
  [215, "Kth Largest Element in an Array", "kth-largest-element-in-an-array", "Medium", "heap-priority-queue"],
  [621, "Task Scheduler", "task-scheduler", "Medium", "heap-priority-queue"],
  [355, "Design Twitter", "design-twitter", "Medium", "heap-priority-queue"],
  [295, "Find Median from Data Stream", "find-median-from-data-stream", "Hard", "heap-priority-queue"],

  // --- Backtracking (9) ---
  [78, "Subsets", "subsets", "Medium", "backtracking"],
  [39, "Combination Sum", "combination-sum", "Medium", "backtracking"],
  [46, "Permutations", "permutations", "Medium", "backtracking"],
  [90, "Subsets II", "subsets-ii", "Medium", "backtracking"],
  [40, "Combination Sum II", "combination-sum-ii", "Medium", "backtracking"],
  [79, "Word Search", "word-search", "Medium", "backtracking"],
  [131, "Palindrome Partitioning", "palindrome-partitioning", "Medium", "backtracking"],
  [17, "Letter Combinations of a Phone Number", "letter-combinations-of-a-phone-number", "Medium", "backtracking"],
  [51, "N-Queens", "n-queens", "Hard", "backtracking"],

  // --- Graphs (13) ---
  [200, "Number of Islands", "number-of-islands", "Medium", "graphs"],
  [133, "Clone Graph", "clone-graph", "Medium", "graphs"],
  [695, "Max Area of Island", "max-area-of-island", "Medium", "graphs"],
  [417, "Pacific Atlantic Water Flow", "pacific-atlantic-water-flow", "Medium", "graphs"],
  [130, "Surrounded Regions", "surrounded-regions", "Medium", "graphs"],
  [994, "Rotting Oranges", "rotting-oranges", "Medium", "graphs"],
  [286, "Walls and Gates", "walls-and-gates", "Medium", "graphs"],
  [207, "Course Schedule", "course-schedule", "Medium", "graphs"],
  [210, "Course Schedule II", "course-schedule-ii", "Medium", "graphs"],
  [684, "Redundant Connection", "redundant-connection", "Medium", "graphs"],
  [323, "Number of Connected Components in an Undirected Graph", "number-of-connected-components-in-an-undirected-graph", "Medium", "graphs"],
  [261, "Graph Valid Tree", "graph-valid-tree", "Medium", "graphs"],
  [127, "Word Ladder", "word-ladder", "Hard", "graphs"],

  // --- Advanced Graphs (6) ---
  [332, "Reconstruct Itinerary", "reconstruct-itinerary", "Hard", "advanced-graphs"],
  [1584, "Min Cost to Connect All Points", "min-cost-to-connect-all-points", "Medium", "advanced-graphs"],
  [743, "Network Delay Time", "network-delay-time", "Medium", "advanced-graphs"],
  [778, "Swim in Rising Water", "swim-in-rising-water", "Hard", "advanced-graphs"],
  [269, "Alien Dictionary", "alien-dictionary", "Hard", "advanced-graphs"],
  [787, "Cheapest Flights Within K Stops", "cheapest-flights-within-k-stops", "Medium", "advanced-graphs"],

  // --- 1D Dynamic Programming (12) ---
  [70, "Climbing Stairs", "climbing-stairs", "Easy", "1d-dynamic-programming"],
  [746, "Min Cost Climbing Stairs", "min-cost-climbing-stairs", "Easy", "1d-dynamic-programming"],
  [198, "House Robber", "house-robber", "Medium", "1d-dynamic-programming"],
  [213, "House Robber II", "house-robber-ii", "Medium", "1d-dynamic-programming"],
  [5, "Longest Palindromic Substring", "longest-palindromic-substring", "Medium", "1d-dynamic-programming"],
  [647, "Palindromic Substrings", "palindromic-substrings", "Medium", "1d-dynamic-programming"],
  [91, "Decode Ways", "decode-ways", "Medium", "1d-dynamic-programming"],
  [322, "Coin Change", "coin-change", "Medium", "1d-dynamic-programming"],
  [152, "Maximum Product Subarray", "maximum-product-subarray", "Medium", "1d-dynamic-programming"],
  [139, "Word Break", "word-break", "Medium", "1d-dynamic-programming"],
  [300, "Longest Increasing Subsequence", "longest-increasing-subsequence", "Medium", "1d-dynamic-programming"],
  [416, "Partition Equal Subset Sum", "partition-equal-subset-sum", "Medium", "1d-dynamic-programming"],

  // --- 2D Dynamic Programming (11) ---
  [62, "Unique Paths", "unique-paths", "Medium", "2d-dynamic-programming"],
  [1143, "Longest Common Subsequence", "longest-common-subsequence", "Medium", "2d-dynamic-programming"],
  [309, "Best Time to Buy and Sell Stock with Cooldown", "best-time-to-buy-and-sell-stock-with-cooldown", "Medium", "2d-dynamic-programming"],
  [518, "Coin Change II", "coin-change-ii", "Medium", "2d-dynamic-programming"],
  [494, "Target Sum", "target-sum", "Medium", "2d-dynamic-programming"],
  [97, "Interleaving String", "interleaving-string", "Medium", "2d-dynamic-programming"],
  [329, "Longest Increasing Path in a Matrix", "longest-increasing-path-in-a-matrix", "Hard", "2d-dynamic-programming"],
  [115, "Distinct Subsequences", "distinct-subsequences", "Hard", "2d-dynamic-programming"],
  [72, "Edit Distance", "edit-distance", "Medium", "2d-dynamic-programming"],
  [312, "Burst Balloons", "burst-balloons", "Hard", "2d-dynamic-programming"],
  [10, "Regular Expression Matching", "regular-expression-matching", "Hard", "2d-dynamic-programming"],

  // --- Greedy (8) ---
  [53, "Maximum Subarray", "maximum-subarray", "Medium", "greedy"],
  [55, "Jump Game", "jump-game", "Medium", "greedy"],
  [45, "Jump Game II", "jump-game-ii", "Medium", "greedy"],
  [134, "Gas Station", "gas-station", "Medium", "greedy"],
  [846, "Hand of Straights", "hand-of-straights", "Medium", "greedy"],
  [1899, "Merge Triplets to Form Target Triplet", "merge-triplets-to-form-target-triplet", "Medium", "greedy"],
  [763, "Partition Labels", "partition-labels", "Medium", "greedy"],
  [678, "Valid Parenthesis String", "valid-parenthesis-string", "Medium", "greedy"],

  // --- Intervals (6) ---
  [57, "Insert Interval", "insert-interval", "Medium", "intervals"],
  [56, "Merge Intervals", "merge-intervals", "Medium", "intervals"],
  [435, "Non-overlapping Intervals", "non-overlapping-intervals", "Medium", "intervals"],
  [252, "Meeting Rooms", "meeting-rooms", "Easy", "intervals"],
  [253, "Meeting Rooms II", "meeting-rooms-ii", "Medium", "intervals"],
  [1851, "Minimum Interval to Include Each Query", "minimum-interval-to-include-each-query", "Hard", "intervals"],

  // --- Math & Geometry (8) ---
  [48, "Rotate Image", "rotate-image", "Medium", "math-geometry"],
  [54, "Spiral Matrix", "spiral-matrix", "Medium", "math-geometry"],
  [73, "Set Matrix Zeroes", "set-matrix-zeroes", "Medium", "math-geometry"],
  [202, "Happy Number", "happy-number", "Easy", "math-geometry"],
  [66, "Plus One", "plus-one", "Easy", "math-geometry"],
  [50, "Pow(x, n)", "powx-n", "Medium", "math-geometry"],
  [43, "Multiply Strings", "multiply-strings", "Medium", "math-geometry"],
  [2013, "Detect Squares", "detect-squares", "Medium", "math-geometry"],

  // --- Bit Manipulation (7) ---
  [136, "Single Number", "single-number", "Easy", "bit-manipulation"],
  [191, "Number of 1 Bits", "number-of-1-bits", "Easy", "bit-manipulation"],
  [338, "Counting Bits", "counting-bits", "Easy", "bit-manipulation"],
  [190, "Reverse Bits", "reverse-bits", "Easy", "bit-manipulation"],
  [268, "Missing Number", "missing-number", "Easy", "bit-manipulation"],
  [371, "Sum of Two Integers", "sum-of-two-integers", "Medium", "bit-manipulation"],
  [7, "Reverse Integer", "reverse-integer", "Medium", "bit-manipulation"],
];

export const neetcode150: SeedProblem[] = entries.map(
  ([leetcodeId, title, slug, difficulty, category]) => ({
    leetcodeId,
    title,
    url: `https://leetcode.com/problems/${slug}/`,
    difficulty,
    category,
    companies: [],
  }),
);
