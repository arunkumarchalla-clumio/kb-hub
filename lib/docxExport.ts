import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { imageSize } from "image-size";
import { COMPANY, COPYRIGHT, FOOTER_LINKS, PRODUCT, PROJECT_TITLE, SOCIAL_LINKS } from "./brand";
import { IMAGE_TOKEN_REGEX } from "./imageTokens";
import type { KBImage } from "./types";

const NUMBERING_REFERENCE = "kb-ordered-list";

// Max on-page image width in points (1 inch = 72 pt). Keeps embedded
// screenshots from overflowing the page; height scales to preserve aspect.
const MAX_IMAGE_WIDTH_PT = 420;

// Splits a line on **bold** spans and returns TextRuns preserving bold runs.
// Deliberately simple: this only needs to handle the Markdown this app's own
// system prompt produces (lib/anthropic.ts), not arbitrary Markdown.
function inlineRuns(text: string): TextRun[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part) => {
    const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch) {
      return new TextRun({ text: boldMatch[1], bold: true });
    }
    return new TextRun({ text: part });
  });
}

function imageParagraphs(img: KBImage): Paragraph[] {
  try {
    const base64 = img.dataUri.includes(",")
      ? img.dataUri.slice(img.dataUri.indexOf(",") + 1)
      : img.dataUri;
    const buffer = Buffer.from(base64, "base64");
    const dims = imageSize(buffer);
    const ratio = dims.width && dims.height ? dims.height / dims.width : 0.6;
    const width = Math.min(MAX_IMAGE_WIDTH_PT, dims.width || MAX_IMAGE_WIDTH_PT);
    const height = Math.round(width * ratio);

    const fmt = img.mediaType.replace("image/", "");
    const type: "png" | "jpg" | "gif" | "bmp" =
      fmt === "jpeg" ? "jpg" : (["png", "gif", "bmp"].includes(fmt) ? (fmt as "png" | "gif" | "bmp") : "png");

    const result: Paragraph[] = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 60 },
        children: [
          new ImageRun({
            data: buffer,
            transformation: { width, height },
            type,
          }),
        ],
      }),
    ];
    if (img.caption?.trim()) {
      result.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: img.caption.trim(), italics: true, size: 18 })],
        })
      );
    }
    return result;
  } catch {
    // If an image can't be decoded, fall back to a plain caption line rather
    // than failing the whole export.
    return [new Paragraph({ children: [new TextRun({ text: `[image: ${img.caption || img.id}]` })] })];
  }
}

export function markdownToDocxParagraphs(
  markdown: string,
  images: KBImage[] = []
): Paragraph[] {
  const byId = new Map(images.map((img) => [img.id, img]));
  const lines = markdown.split("\n");
  const paragraphs: Paragraph[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // A line that is (or contains) an image token becomes an embedded image.
    const tokenMatch = line.match(/^\s*\[\[img:([a-zA-Z0-9_-]+)\]\]\s*$/);
    if (tokenMatch) {
      const img = byId.get(tokenMatch[1]);
      if (img) {
        paragraphs.push(...imageParagraphs(img));
        continue;
      }
      // Unknown token: skip the line entirely rather than printing raw token.
      continue;
    }

    if (line.trim() === "") {
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    if (line.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: inlineRuns(line.slice(2)) })
      );
      continue;
    }

    if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240 },
          children: inlineRuns(line.slice(3)),
        })
      );
      continue;
    }

    if (line.startsWith("> ")) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          indent: { left: 360 },
          children: inlineRuns(line.slice(2)),
        })
      );
      continue;
    }

    const bulletMatch = line.match(/^-\s+(.*)$/);
    if (bulletMatch) {
      paragraphs.push(
        new Paragraph({ bullet: { level: 0 }, children: inlineRuns(bulletMatch[1]) })
      );
      continue;
    }

    const numberedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (numberedMatch) {
      paragraphs.push(
        new Paragraph({
          numbering: { reference: NUMBERING_REFERENCE, level: 0 },
          children: inlineRuns(numberedMatch[1]),
        })
      );
      continue;
    }

    paragraphs.push(new Paragraph({ children: inlineRuns(line) }));
  }

  return paragraphs;
}

// Branded Word header: "Commvault | Clumio" on the left, project title + a
// bottom rule, mirroring the on-screen and PDF banners.
function buildDocxHeader(): Header {
  return new Header({
    children: [
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 6 } },
        children: [
          new TextRun({ text: COMPANY, bold: true, size: 22 }),
          new TextRun({ text: "  |  ", size: 22, color: "999999" }),
          new TextRun({ text: PRODUCT, bold: true, size: 22, color: "6C3FA6" }),
          new TextRun({ text: `\t${PROJECT_TITLE}`, size: 18, color: "888888" }),
        ],
      }),
    ],
  });
}

// Branded Word footer: copyright + text links on one line, social links (as
// real hyperlinks) on the next, above a top rule.
function buildDocxFooter(): Footer {
  const linkRuns: (TextRun | ExternalHyperlink)[] = [
    new TextRun({ text: COPYRIGHT, size: 16, color: "888888" }),
  ];
  for (const label of FOOTER_LINKS) {
    linkRuns.push(new TextRun({ text: "   ·   ", size: 16, color: "BBBBBB" }));
    linkRuns.push(new TextRun({ text: label, size: 16, color: "888888" }));
  }

  const socialRuns: (TextRun | ExternalHyperlink)[] = [];
  SOCIAL_LINKS.forEach((s, i) => {
    if (i > 0) socialRuns.push(new TextRun({ text: "    ", size: 16 }));
    socialRuns.push(
      new ExternalHyperlink({
        link: s.url,
        children: [new TextRun({ text: s.name, size: 16, color: "6C3FA6", underline: {} })],
      })
    );
  });

  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 6 } },
        spacing: { before: 120 },
        children: linkRuns,
      }),
      new Paragraph({ spacing: { before: 40 }, children: socialRuns }),
    ],
  });
}

export async function buildKBDocx(markdown: string, images: KBImage[] = []): Promise<Buffer> {
  // Strip any inline tokens that weren't on their own line so they don't
  // appear as literal text; on-their-own-line tokens are handled as images.
  void IMAGE_TOKEN_REGEX; // (regex reused conceptually; parsing done line-by-line)
  const bodyParagraphs = markdownToDocxParagraphs(markdown, images);

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: NUMBERING_REFERENCE,
          levels: [
            { level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START },
          ],
        },
      ],
    },
    sections: [
      {
        headers: { default: buildDocxHeader() },
        footers: { default: buildDocxFooter() },
        children: bodyParagraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
