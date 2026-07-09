export type ArticleTone = "technical" | "plain" | "engineering";

export type Audience = "Internal" | "Public" | "Engineering";

export const AUDIENCE_OPTIONS: Audience[] = ["Internal", "Public", "Engineering"];

export const AUDIENCE_TONE_MAP: Record<Audience, ArticleTone> = {
  Internal: "technical",
  Public: "plain",
  Engineering: "engineering",
};

export type ImageSection = "symptoms" | "resolution";

export interface KBImage {
  id: string;
  token: string;
  section: ImageSection;
  caption: string;
  dataUri: string;
  mediaType: string;
}

// A manually-supplied reference link.
// isInternal=true  → shown to Internal & Engineering audiences only.
// isInternal=false → shown to all audiences including Public.
export interface ReferenceLink {
  id: string;        // stable key for React, e.g. "ref-1"
  url: string;
  label: string;     // display text; falls back to url if blank
  isInternal: boolean;
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
  referenceLinks: ReferenceLink[];
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
