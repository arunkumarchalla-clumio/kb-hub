import Anthropic from "@anthropic-ai/sdk";
import type { ArticleTone, KBFormFields, KBImage, ReferenceLink } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AWS_KNOWLEDGE_MCP_URL = "https://knowledge-mcp.global.api.aws";
const AWS_KNOWLEDGE_MCP_SERVER_NAME = "aws-knowledge";
const MCP_CONNECTOR_BETA = "mcp-client-2025-11-20";

// FAQ rules differ by audience:
// - Public: include FAQ (end users benefit from Q&A)
// - Internal / Engineering: omit FAQ entirely (support staff don't need it)
function faqSection(audience: string): string {
  if (audience === "Public") {
    return `## FAQ
2-3 likely follow-up questions a reader would have after reading this article, each as "**Q: ...**" followed by a concise answer on the next line. Only ask questions you can actually answer from the given fields — do not invent questions whose answers would require information not provided.

`;
  }
  // Internal and Engineering: no FAQ section at all.
  return "";
}

// References section is always present. Claude is told to:
// - Include AWS doc links it actually consulted (if AWS docs is on)
// - Include the manually-supplied links passed in the prompt
// - Mark internal links clearly with "[INTERNAL]" prefix so the preview can split them
// - Never fabricate a URL
function referencesSection(hasAwsDocs: boolean): string {
  const awsNote = hasAwsDocs
    ? " If you used the AWS documentation tool, also list the real AWS doc URLs you consulted."
    : "";
  return `## References
List all reference links in this section as a Markdown bullet list.${awsNote}

For each manually-supplied link provided in the prompt, output it exactly as:
- [INTERNAL] [label](url)   ← for links marked as internal
- [label](url)               ← for links marked as external

Never invent or fabricate a URL. If no links were supplied and you did not consult any AWS docs, write "No references."

`;
}

function baseStructure(audience: string, hasAwsDocs: boolean): string {
  const awsRule = hasAwsDocs
    ? `\n- When the Primary Entity Type, Product/Version, or Symptoms reference a specific AWS service, API, error code, or behavior, use the AWS documentation tools available to you to verify details before writing the Cause and Resolution sections. Prefer verified, current information over assumption.`
    : "";

  return `Always output ONLY Markdown, in exactly this structure and order, with no preamble or closing remarks:

# {Title}

**Summary:** 1-3 sentence summary of the issue and the fix.

## Symptoms
- Bullet list of observable symptoms.

## Cause
Short paragraph explaining the root cause.

## Resolution
1. Numbered, imperative-voice steps.

## Applies To
- Product/Version, Audience, Issue Type, and Primary Entity Type, as bullet points.

${faqSection(audience)}${referencesSection(hasAwsDocs)}## Keywords
Comma-separated keywords.

Rules:
- Use only the information given in the fields. Do not invent details.
- If a field is blank or vague, say so plainly in that section (e.g. "No symptoms provided") instead of fabricating content.
- Resolution steps must be a numbered list, one action per step.${awsRule}`;
}

const TONE_INSTRUCTIONS: Record<ArticleTone, string> = {
  technical: `Write for an IT admin / technical support audience. Use precise technical terminology (service names, exact menu paths, command syntax, error codes) without over-explaining basics. Assume the reader is comfortable with system administration. Keep language direct and instructional, not marketing copy.`,
  plain: `Write for an end user with no technical background. Avoid jargon; when a technical term is unavoidable, briefly explain it in plain words the first time it's used. Prefer short sentences and concrete, everyday language over precise technical terminology. Resolution steps should read like patient, friendly instructions a non-technical person could follow without help.`,
  engineering: `Write for a software engineering audience. Use precise technical terminology freely, and wherever the resolution involves code, configuration, commands, API calls, or scripts, include them as fenced code blocks and briefly explain what each non-obvious line or flag does and why it's needed. Assume strong technical background, but never leave a code snippet unexplained if its purpose isn't self-evident from context. Prefer being thorough over being brief when it comes to implementation detail.`,
};

function buildSystemPrompt(tone: ArticleTone, audience: string, hasAwsDocs: boolean): string {
  return `You write Knowledge Base (KB) articles for a support team from structured field input.

${TONE_INSTRUCTIONS[tone]}

${baseStructure(audience, hasAwsDocs)}`;
}

function imageInstructions(images: KBImage[]): string {
  if (!images.length) return "";
  const lines = images
    .map(
      (img) =>
        `- ${img.token} — ${img.section === "symptoms" ? "Symptoms/Cause" : "Resolution"} screenshot${
          img.caption ? `: "${img.caption}"` : ""
        }`
    )
    .join("\n");
  return `

The user attached the following screenshots (shown to you as images below, in the same order). Each has a placeholder token:
${lines}

Place each token on its own line in the section it belongs to, at the point where it best illustrates the surrounding text. Use the token exactly as written (e.g. ${images[0].token}); do NOT write Markdown image syntax yourself — the token is replaced with the real image afterward. Only place a token where it genuinely helps; if a screenshot isn't useful anywhere, you may omit its token.`;
}

// Tells Claude exactly which reference links to include and how to mark them.
function referenceInstructions(links: ReferenceLink[]): string {
  if (!links.length) return "";
  const lines = links
    .map((l) => {
      const label = l.label.trim() || l.url;
      const tag = l.isInternal ? "[INTERNAL]" : "[EXTERNAL]";
      return `- ${tag} ${label}: ${l.url}`;
    })
    .join("\n");
  return `

The following reference links were manually provided. Include ALL of them in the References section, marking each with [INTERNAL] or [EXTERNAL] exactly as shown:
${lines}`;
}

export async function generateKBArticle(
  fields: KBFormFields,
  images: KBImage[] = []
): Promise<string> {
  const tone: ArticleTone = TONE_INSTRUCTIONS[fields.tone] ? fields.tone : "technical";
  const useAwsDocs = Boolean(fields.useAwsDocs);
  const links: ReferenceLink[] = Array.isArray(fields.referenceLinks)
    ? fields.referenceLinks.filter((l) => l.url.trim())
    : [];

  const promptText = `Generate a KB article from these fields:

Title: ${fields.title || "(not provided)"}
Issue Type: ${fields.issueType || "(not provided)"}
Primary Entity Type: ${fields.primaryEntityType || "(not provided)"}
Category: ${fields.category || "(not provided)"}
Product/Version: ${fields.productVersion || "(not provided)"}
Audience: ${fields.audience || "(not provided)"}
Symptoms: ${fields.symptoms || "(not provided)"}
Cause: ${fields.cause || "(not provided)"}
Resolution Steps: ${fields.resolutionSteps || "(not provided)"}
Keywords: ${fields.keywords || "(not provided)"}${referenceInstructions(links)}${imageInstructions(images)}`;

  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    { type: "text", text: promptText },
  ];
  for (const img of images) {
    const base64 = img.dataUri.includes(",")
      ? img.dataUri.slice(img.dataUri.indexOf(",") + 1)
      : img.dataUri;
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
        data: base64,
      },
    });
  }

  const response = await client.beta.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2500,
    system: buildSystemPrompt(tone, fields.audience, useAwsDocs),
    messages: [{ role: "user", content }],
    betas: [MCP_CONNECTOR_BETA],
    ...(useAwsDocs
      ? {
          mcp_servers: [
            { type: "url" as const, url: AWS_KNOWLEDGE_MCP_URL, name: AWS_KNOWLEDGE_MCP_SERVER_NAME },
          ],
          tools: [
            {
              type: "mcp_toolset" as const,
              mcp_server_name: AWS_KNOWLEDGE_MCP_SERVER_NAME,
              default_config: { enabled: false },
              configs: {
                search_documentation: { enabled: true },
                read_documentation: { enabled: true },
              },
            },
          ],
        }
      : {}),
  });

  const text = response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n\n")
    .trim();

  if (!text) throw new Error("No text content returned from Claude");
  return text;
}
