export interface KBFormFields {
  title: string;
  category: string;
  productVersion: string;
  audience: string;
  symptoms: string;
  cause: string;
  resolutionSteps: string;
  keywords: string;
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
