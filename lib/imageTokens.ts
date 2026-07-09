import type { KBImage } from "./types";

// Matches placeholder tokens like [[img:sy1]] that can appear in article
// Markdown. Kept deliberately strict (letters, digits, _ and -) so it won't
// accidentally swallow normal prose.
export const IMAGE_TOKEN_REGEX = /\[\[img:([a-zA-Z0-9_-]+)\]\]/g;

export function makeImageId(section: "symptoms" | "resolution", index: number): string {
  const prefix = section === "symptoms" ? "sy" : "re";
  return `${prefix}${index}`;
}

export function makeImageToken(id: string): string {
  return `[[img:${id}]]`;
}

// Replaces every [[img:xxx]] token in the Markdown with a real Markdown image
// (data-URI inline), so the result renders/exports as an actual picture.
// Tokens with no matching image are left as-is (harmless literal text).
export function expandImageTokens(markdown: string, images: KBImage[]): string {
  if (!images.length) return markdown;
  const byId = new Map(images.map((img) => [img.id, img]));
  return markdown.replace(IMAGE_TOKEN_REGEX, (match, id: string) => {
    const img = byId.get(id);
    if (!img) return match;
    const alt = img.caption?.trim() || `Screenshot ${id}`;
    return `\n\n![${alt}](${img.dataUri})\n\n`;
  });
}

// Which image tokens are actually referenced in the given Markdown.
export function referencedImageIds(markdown: string): Set<string> {
  const ids = new Set<string>();
  for (const m of markdown.matchAll(IMAGE_TOKEN_REGEX)) {
    ids.add(m[1]);
  }
  return ids;
}
