export type ArticleTone = "technical" | "plain" | "engineering";

export type Audience = "Internal" | "Public" | "Engineering";

export const AUDIENCE_OPTIONS: Audience[] = ["Internal", "Public", "Engineering"];

// Tone is derived from audience, not chosen independently:
// - Internal readers (IT/support staff) get technical language.
// - Public readers (end users) get plain, jargon-free language.
// - Engineering readers get technical language plus detailed explanations
//   of any coding/config instructions.
export const AUDIENCE_TONE_MAP: Record<Audience, ArticleTone> = {
  Internal: "technical",
  Public: "plain",
  Engineering: "engineering",
};

export interface KBFormFields {
  title: string;
  issueType: string;
  primaryEntityType: string;
  category: string;
  productVersion: string;
  audience: Audience;
  symptoms: string;
  cause: string;
  resolutionSteps: string;
  keywords: string;
  tone: ArticleTone;
}

export interface GenerateKBRequest {
  fields: KBFormFields;
}

export interface GenerateKBResponse {
  markdown: string;
}

export interface GenerateKBError {
  error: string;
}
