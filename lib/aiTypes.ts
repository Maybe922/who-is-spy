export type AiProviderType = "openai-compatible" | "anthropic";

export type AiConfig = {
  providerType: AiProviderType;
  baseUrl: string;
  apiKey: string;
  model: string;
};

export const AI_CONFIG_KEY = "who-is-spy:ai-config";
