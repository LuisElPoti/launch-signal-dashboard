export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score?: number;
  published_date?: string;
}

export interface TavilySearchResponse {
  query: string;
  answer?: string;
  results: TavilyResult[];
}

interface TavilySearchOptions {
  topic?: "general" | "news" | "finance";
}

function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

export async function searchTavily(
  query: string,
  options: TavilySearchOptions = {}
): Promise<TavilySearchResponse | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || isDemoMode()) return null;

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        topic: options.topic ?? "finance",
        search_depth: "advanced",
        include_answer: "advanced",
        include_raw_content: false,
        include_favicon: false,
        max_results: 10,
      }),
      next: { revalidate: 60 * 60 },
    });

    if (!response.ok) return null;

    return (await response.json()) as TavilySearchResponse;
  } catch {
    return null;
  }
}
