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

export type ImageSection = "symptoms" | "resolution";

// An attached screenshot. `token` is the placeholder ([[img:sy1]]) that can
// appear in the article Markdown; it's expanded to the real image at
// render/export time. `dataUri` is a full data:image/...;base64,... string.
export interface KBImage {
  id: string; // e.g. "sy1", "re1"
  token: string; // e.g. "[[img:sy1]]"
  section: ImageSection;
  caption: string;
  dataUri: string;
  mediaType: string; // e.g. "image/png"
}

export interface KBFormFields {
  title: string;
  issueType: string;
  primaryEntityType: string;
  category: string;
  productVersion: string;
  audience: Audience;
  useAwsDocs: boolean;
  symptoms: string;
  cause: string;
  resolutionSteps: string;
  keywords: string;
  tone: ArticleTone;
}

export interface GenerateKBRequest {
  fields: KBFormFields;
  images?: KBImage[];
}

export interface GenerateKBResponse {
  markdown: string;
}

export interface GenerateKBError {
  error: string;
}
