import type { AiConfig } from "./aiTypes";

export async function callAi(
  config: AiConfig,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1000
): Promise<string> {
  if (config.providerType === "anthropic") {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: config.apiKey });
    const res = await client.messages.create({
      model: config.model,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: maxTokens,
    });
    const block = res.content[0];
    return block.type === "text" ? block.text.trim() : "";
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({
    apiKey: config.apiKey || "no-key",
    baseURL: config.baseUrl || "https://api.openai.com/v1",
  });
  const res = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.9,
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}
