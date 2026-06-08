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
  }
}`;

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

export function extractSlug(url: string): string | null {
  const match = url.match(/leetcode\.com\/problems\/([^/?#]+)/i);
  return match ? match[1] : null;
}

export function extractNeetcodeSlug(url: string): string | null {
  const match = url.match(/neetcode\.io\/problems\/([^/?#]+)/i);
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

async function fetchLeetcodeBySlug(slug: string): Promise<FetchMetadataResponse> {
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

async function fetchNeetcodeMetadata(url: string): Promise<FetchMetadataResponse> {
  const neetcodeSlug = extractNeetcodeSlug(url);
  if (!neetcodeSlug) {
    throw new HttpError(400, `Could not extract a problem slug from NeetCode URL: ${url}`);
  }

  // Title always comes from the URL slug: "insert-new-interval" → "Insert New Interval"
  const title = neetcodeSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  // Try to get difficulty and category by finding the embedded LeetCode link on the page
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (res.ok) {
      const html = await res.text();
      const lcLinkMatch = html.match(/https:\/\/(?:www\.)?leetcode\.com\/problems\/([a-z0-9-]+)/i);
      if (lcLinkMatch) {
        const lcData = await fetchLeetcodeBySlug(lcLinkMatch[1]);
        return { ...lcData, title };
      }
    }
  } catch {
    // fall through to defaults
  }

  return { title, difficulty: "Medium", categorySlug: null, rawTags: [] };
}

/**
 * Fetch problem metadata from a LeetCode or NeetCode URL.
 * For NeetCode URLs, scrapes the page to find the linked LeetCode problem,
 * then uses the LeetCode GraphQL API for full metadata.
 */
export async function fetchMetadata(url: string): Promise<FetchMetadataResponse> {
  if (url.includes("neetcode.io")) {
    return fetchNeetcodeMetadata(url);
  }

  const slug = extractSlug(url);
  if (!slug) {
    throw new HttpError(400, `Could not extract a problem slug from URL: ${url}`);
  }
  return fetchLeetcodeBySlug(slug);
}
