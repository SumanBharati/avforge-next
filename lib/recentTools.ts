const KEY = "avforge_recent_tools";
const MAX = 10;

export function addRecentTool(href: string) {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(KEY);
    const list: string[] = stored ? JSON.parse(stored) : [];
    const filtered = list.filter((h) => h !== href);
    filtered.unshift(href);
    localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, MAX)));
  } catch {
    /* localStorage unavailable */
  }
}

export function getRecentTools(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}
