// Gemini Models
export type GeminiModelId = keyof typeof geminiModels;
export const geminiDefaultModelId: GeminiModelId = "gemini-2.5-flash-preview-05-20";
export const geminiModels = {
  "gemini-2.5-flash-preview-05-20": {
    name: "Gemini 2.5 Flash",
    inputPrice: 0.15,
    outputPrice: 0.6,
    maxTokens: 65536,
    contextWindow: 1048576,
    supportsImages: true,
    supportsPromptCache: true,
    thinkingConfig: {
      maxBudget: 24576,
      outputPrice: 3.5,
    },
  },
  "gemini-2.5-pro-preview-05-06": {
    name: "Gemini 2.5 Pro",
    inputPrice: 1.25,
    outputPrice: 10.0,
    maxTokens: 65536,
    contextWindow: 1048576,
    supportsImages: true,
    supportsPromptCache: true,
  },
  "gemini-2.0-flash-001": {
    name: "Gemini 2.0 Flash",
    inputPrice: 0.1,
    outputPrice: 0.4,
    maxTokens: 8192,
    contextWindow: 1048576,
    supportsImages: true,
    supportsPromptCache: false,
  },
  "gemini-2.0-flash-lite-preview-02-05": {
    name: "Gemini 2.0 Flash Lite",
    inputPrice: 0.075,
    outputPrice: 0.30,
    maxTokens: 8192,
    contextWindow: 1048576,
    supportsImages: true,
    supportsPromptCache: false,
  },
};
