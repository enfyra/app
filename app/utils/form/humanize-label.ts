const ACRONYMS = new Set(["id", "url", "api", "ui", "css", "html", "sql", "http", "https", "json", "xml", "ip", "uri"]);

export function humanizeIdentifier(raw: string): string {
  if (!raw) return raw;

  const words = raw
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_\-./]+/g, " ")
    .trim()
    .split(/\s+/);

  if (words.length === 0) return raw;

  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function resolveLabel(explicit: string | undefined | null, identifier: string): string {
  if (explicit && explicit.trim()) return explicit;
  return humanizeIdentifier(identifier);
}
