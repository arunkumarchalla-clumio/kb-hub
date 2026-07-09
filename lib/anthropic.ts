import Anthropic from "@anthropic-ai/sdk";
import type { ArticleTone, KBFormFields, KBImage } from "./types";

// Server-side only. Never import this file from a "use client" component.
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// AWS's own hosted, public, no-auth-required MCP server. Gives Claude tools
// to search/read real AWS documentation while writing the article, instead
// of relying only on its training data. See:
// https://awslabs.github.io/mcp/servers/aws-knowledge-mcp-server
const AWS_KNOWLEDGE_MCP_URL = "https://knowledge-mcp.global.api.aws";
const AWS_KNOWLEDGE_MCP_SERVER_NAME = "aws-knowledge";

// Current MCP connector API version. Anthropic revs this occasionally —
// check https://docs.claude.com/en/docs/agents-and-tools/mcp-connector
// if requests start failing with a beta-header error.
const MCP_CONNECTOR_BETA = "mcp-client-2025-11-20";

function baseStructure(hasAwsDocs: boolean): string {
  const referencesSection = hasAwsDocs
    ? `## References
If you used the AWS documentation tool to verify or research anything in this article, list the real documentation URLs you consulted here as a Markdown bullet list (e.g. "- [Amazon EBS snapshots](https://docs.aws.amazon.com/...)"). Never invent or guess a URL — only include ones actually returned by the tool. If you didn't use the tool or found nothing relevant, write "No external references consulted."

`
    : "";

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

## FAQ
2-3 likely follow-up questions a reader would have after reading this article, each as "**Q: ...**" followed by a concise answer on the next line. Only ask questions you can actually answer from the given fields — do not invent questions whose answers would require information not provided.

${referencesSection}## Keywords
Comma-separated keywords.

Rules:
- Use only the information given in the fields. Do not invent details.
- If a field is blank or vague, say so plainly in that section (e.g. "No symptoms provided") instead of fabricating content.
- Resolution steps must be a numbered list, one action per step.
- If there isn't enough information to write any genuine, well-grounded FAQ question, write "No frequently asked questions identified." under FAQ instead of forcing one.${awsRule}`;
}

const TONE_INSTRUCTIONS: Record<ArticleTone, string> = {
  technical: `Write for an IT admin / technical support audience. Use precise technical terminology (service names, exact menu paths, command syntax, error codes) without over-explaining basics. Assume the reader is comfortable with system administration. Keep language direct and instructional, not marketing copy.`,
  plain: `Write for an end user with no technical background. Avoid jargon; when a technical term is unavoidable, briefly explain it in plain words the first time it's used. Prefer short sentences and concrete, everyday language over precise technical terminology. Resolution steps should read like patient, friendly instructions a non-technical person could follow without help.`,
  engineering: `Write for a software engineering audience. Use precise technical terminology freely, and wherever the resolution involves code, configuration, commands, API calls, or scripts, include them as fenced code blocks and briefly explain what each non-obvious line or flag does and why it's needed. Assume strong technical background, but never leave a code snippet unexplained if its purpose isn't self-evident from context. Prefer being thorough over being brief when it comes to implementation detail.`,
};

function buildSystemPrompt(tone: ArticleTone, hasAwsDocs: boolean): string {
  return `You write internal Knowledge Base (KB) articles for a support team from structured field input.

${TONE_INSTRUCTIONS[tone]}

${baseStructure(hasAwsDocs)}`;
}

// Builds the instruction block telling Claude which image placeholder tokens
// are available and where to place them. The images themselves are attached
// separately as vision input so Claude can see what each one shows.
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

export async function generateKBArticle(
  fields: KBFormFields,
  images: KBImage[] = []
): Promise<string> {
  const tone: ArticleTone = TONE_INSTRUCTIONS[fields.tone] ? fields.tone : "technical";
  const useAwsDocs = Boolean(fields.useAwsDocs);

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
Keywords: ${fields.keywords || "(not provided)"}${imageInstructions(images)}`;

  // Build the user message content: the text prompt, then each attached image
  // as vision input so Claude can actually see what to describe/place.
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
    system: buildSystemPrompt(tone, useAwsDocs),
    messages: [{ role: "user", content }],
    betas: [MCP_CONNECTOR_BETA],
    ...(useAwsDocs
      ? {
          mcp_servers: [
            {
              type: "url" as const,
              url: AWS_KNOWLEDGE_MCP_URL,
              name: AWS_KNOWLEDGE_MCP_SERVER_NAME,
            },
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

  // With tools involved, Claude may emit text before AND after tool calls,
  // as separate text blocks — so join all of them rather than taking the first.
  const text = response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n\n")
    .trim();

  if (!text) {
    throw new Error("No text content returned from Claude");
  }

  return text;
}
