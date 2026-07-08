import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

const NUMBERING_REFERENCE = "kb-ordered-list";

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

export function markdownToDocxParagraphs(markdown: string): Paragraph[] {
  const lines = markdown.split("\n");
  const paragraphs: Paragraph[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === "") {
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    if (line.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: inlineRuns(line.slice(2)),
        })
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
        new Paragraph({
          bullet: { level: 0 },
          children: inlineRuns(bulletMatch[1]),
        })
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

export async function buildKBDocx(markdown: string, tldr: string): Promise<Buffer> {
  const bodyParagraphs: Paragraph[] = [];

  if (tldr) {
    bodyParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: "TL;DR: ", bold: true }),
          new TextRun({ text: tldr, italics: true }),
        ],
      }),
      new Paragraph({ text: "" })
    );
  }

  bodyParagraphs.push(...markdownToDocxParagraphs(markdown));

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: NUMBERING_REFERENCE,
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [{ children: bodyParagraphs }],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
