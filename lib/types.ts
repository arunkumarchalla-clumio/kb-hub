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

// A workflow / architecture / diagnostic image uploaded in Step 1.
// Claude analyzes its content to inform the article — it is NOT embedded
// as a visible image in the output. Kept separate from KBImage (Steps 2–3)
// which are illustrative screenshots placed inline via tokens.
export interface DiagramImage {
  dataUri: string;
  mediaType: string;
  filename: string;  // display name shown in the UI
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
  engineerName: string;
  engineerEmail: string;
  referenceLinks: ReferenceLink[];
  diagramImage: DiagramImage[];  // optional workflow/architecture images for analysis (Step 1)
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

// Engineer identity — entered once in Step 1, persisted to localStorage,
// and saved with every article to the database.
export interface EngineerIdentity {
  name: string;
  email: string;
}
