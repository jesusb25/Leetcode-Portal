import type { Difficulty, FetchMetadataResponse } from "@repo/shared";
import { HttpError } from "../middleware/error.js";

const GRAPHQL_ENDPOINT = "https://leetcode.com/graphql";

const QUERY = `
query getProblem($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    title
    titleSlug
    difficulty
    topicTags {
      name
      slug
    }
    companyTagStats
  }
}`;

/**
 * Map LeetCode topic-tag slugs to our internal category slugs. LeetCode tags are
 * fine-grained (e.g. "hash-table", "depth-first-search"); we collapse them onto the
 * NeetCode sections. Order matters — earlier keys win when several tags are present,
 * so the resolver checks tags in the order LeetCode returns them.
 */
const TAG_TO_CATEGORY: Record<string, string> = {
  "hash-table": "arrays-hashing",
  array: "arrays-hashing",
  "two-pointers": "two-pointers",
  "sliding-window": "sliding-window",
  stack: "stack",
  "monotonic-stack": "stack",
  "binary-search": "binary-search",
  "linked-list": "linked-list",
  tree: "trees",
  "binary-tree": "trees",
  "binary-search-tree": "trees",
  trie: "tries",
  heap: "heap-priority-queue",
  "priority-queue": "heap-priority-queue",
  backtracking: "backtracking",
  graph: "graphs",
  "union-find": "graphs",
  "topological-sort": "graphs",
  "shortest-path": "advanced-graphs",
  "minimum-spanning-tree": "advanced-graphs",
  "dynamic-programming": "1d-dynamic-programming",
  greedy: "greedy",
  "interval-scheduling": "intervals",
  math: "math-geometry",
  geometry: "math-geometry",
  matrix: "math-geometry",
  "bit-manipulation": "bit-manipulation",
};

const VALID_DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

/** Extract the title slug from a LeetCode problem URL. */
export function extractSlug(url: string): string | null {
  const match = url.match(/leetcode\.com\/problems\/([^/?#]+)/i);
  return match ? match[1] : null;
}

type GraphQLResponse = {
  data?: {
    question: {
      questionId: string;
      title: string;
      titleSlug: string;
      difficulty: string;
      topicTags: { name: string; slug: string }[];
    } | null;
  };
};

/**
 * Fetch problem metadata from LeetCode's GraphQL API (spec §7).
 * Returns the closest matching internal category slug (or null) plus the raw tags.
 */
export async function fetchMetadata(url: string): Promise<FetchMetadataResponse> {
  const slug = extractSlug(url);
  if (!slug) {
    throw new HttpError(400, `Could not extract a problem slug from URL: ${url}`);
  }

  let res: Response;
  try {
    res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: `https://leetcode.com/problems/${slug}/`,
      },
      body: JSON.stringify({ query: QUERY, variables: { titleSlug: slug } }),
    });
  } catch (err) {
    throw new HttpError(502, `Failed to reach LeetCode: ${(err as Error).message}`);
  }

  if (!res.ok) {
    throw new HttpError(502, `LeetCode returned status ${res.status}.`);
  }

  const json = (await res.json()) as GraphQLResponse;
  const question = json.data?.question;
  if (!question) {
    throw new HttpError(404, `No LeetCode problem found for slug "${slug}".`);
  }

  const difficulty = VALID_DIFFICULTIES.includes(question.difficulty as Difficulty)
    ? (question.difficulty as Difficulty)
    : "Medium";

  const rawTags = question.topicTags ?? [];
  let categorySlug: string | null = null;
  for (const tag of rawTags) {
    const mapped = TAG_TO_CATEGORY[tag.slug];
    if (mapped) {
      categorySlug = mapped;
      break;
    }
  }

  return {
    title: question.title,
    difficulty,
    leetcodeId: Number(question.questionId),
    categorySlug,
    rawTags,
  };
}
