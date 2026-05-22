// Shared types between client + UI for the new free-form docs agent.

export type DocsClarifyQuestionType =
  | "text"
  | "long_text"
  | "choice"
  | "multi_choice"
  | "number"
  | "date"
  | "email"
  | "phone"
  | "url"
  | "image";

export type DocsClarifyQuestion = {
  id: string;
  label: string;
  /** Short helper sentence shown under the label. */
  help?: string;
  type: DocsClarifyQuestionType;
  /** Required questions block the wizard's "next" until answered. */
  required?: boolean;
  /** For choice/multi_choice. */
  options?: string[];
  placeholder?: string;
  /** Optional grouping label for the wizard progress (e.g. "بياناتك", "بيانات العميل"). */
  group?: string;
  /** Optional max length for text inputs. */
  maxLength?: number;
};

export type DocsClarifyResponse = {
  kind: "clarify";
  reason: string;
  questions: DocsClarifyQuestion[];
};

export type DocsHtmlResponse = {
  kind: "html";
  doc_type: string;
  title: string;
  html: string;
};

export type DocsGenerateResponse = DocsClarifyResponse | DocsHtmlResponse;

export type DocsArtifactMeta = {
  artifactId: string;
  title: string;
  doc_type: string;
  html: string;
  createdAt: number;
};
