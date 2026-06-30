import OpenAI from "openai";
import { LLMProvider, ProviderOptions, ModelInfo, ApiStream, StreamChunk } from './types';

export interface OpenAICompatibleModelInfo extends ModelInfo {
  isReasoning?: boolean;
}

export interface OpenAICompatibleModel {
  id: string;
  name: string;
  isReasoningModel?: boolean;
  contextWindow?: number;
  maxTokens?: number;
}

export interface OpenAICompatibleProviderOptions extends ProviderOptions {
  openaiCompatibleModels: OpenAICompatibleModel[];
}

export interface OpenAICompatibleInstance {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  modelId: string;
  models: OpenAICompatibleModel[];
  enabledModelIds?: string[];
}

export class OpenAICompatibleProvider implements LLMProvider {
  static getAvailableModels(options: OpenAICompatibleProviderOptions): { id: string; name: string }[] {
    return (options.openaiCompatibleModels || []).map(m => ({ id: m.id, name: m.name }));
  }

  private options: OpenAICompatibleProviderOptions;
  private client: OpenAI;

  constructor(options: OpenAICompatibleProviderOptions) {
    this.options = options;
    this.client = new OpenAI({
      apiKey: this.options.apiKey || 'dummy-key',
      baseURL: this.options.baseUrl,
    });
  }

  async *createMessage(systemPrompt: string, messages: any[], tools?: any[]): ApiStream {
    const model = this.getModel();
    const modelId = model.id;
    const modelInfo = model.info;
    const isReasoningModel = modelInfo.isReasoning;

    const filteredMessages = messages.filter(message =>
      !(message.role === "user" && typeof message.content === "string" && message.content.startsWith("[SYSTEM INSTRUCTION:"))
    );

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...filteredMessages.map(msg => ({ role: msg.role, content: msg.content })),
    ];

    const options: any = {
      model: modelId,
      messages: openaiMessages,
      stream: true,
      stream_options: { include_usage: true },
    };

    if (isReasoningModel) {
      options.max_completion_tokens = modelInfo.maxTokens || 4096;
      options.temperature = 0;
    } else {
      options.max_tokens = modelInfo.maxTokens || 4096;
      options.temperature = 0;
    }

    if (tools && tools.length > 0) {
      const openAITools = tools.map(tool => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "object",
            properties: {
              input: { type: "string", description: "The input to the tool" },
              requires_approval: { type: "boolean", description: "Whether this tool call requires user approval" }
            },
            required: ["input"]
          }
        }
      }));
      options.tools = openAITools;
      options.tool_choice = "auto";
    }

    try {
      const stream = await this.client.chat.completions.create(options) as unknown as AsyncIterable<any>;

      let toolCallId = null;
      let toolName = null;
      let toolArguments = null;
      let isCollectingToolCall = false;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          yield { type: "text", text: delta.content };
        }

        if (delta?.tool_calls && delta.tool_calls.length > 0) {
          const toolCall = delta.tool_calls[0];
          
          if (toolCall.index === 0 && toolCall.function?.name) {
            isCollectingToolCall = true;
            toolCallId = toolCall.id;
            toolName = toolCall.function.name;
            toolArguments = toolCall.function.arguments || "";
          } 
          else if (isCollectingToolCall && toolCall.function?.arguments) {
            toolArguments += toolCall.function.arguments;
          }
          
          if (chunk.choices[0]?.finish_reason === "tool_calls" && isCollectingToolCall) {
            try {
              let args;
              try {
                args = JSON.parse(toolArguments || "{}");
              } catch (parseError) {
                const jsonObjects = toolArguments.split(/(?<=\})(?=\{)/);
                if (jsonObjects.length > 1) {
                  args = JSON.parse(jsonObjects[0]);
                } else {
                  const sanitizedArgs = toolArguments
                    .replace(/(\w+)\[name="([^"]+)"\]/g, '$1[name=\'$2\']')
                    .replace(/(\w+)\[class="([^"]+)"\]/g, '$1[class=\'$2\']')
                    .replace(/(\w+)\[id="([^"]+)"\]/g, '$1[id=\'$2\']')
                    .replace(/(\w+)\[type="([^"]+)"\]/g, '$1[type=\'$2\']')
                    .replace(/(\w+)\[value="([^"]+)"\]/g, '$1[value=\'$2\']');
                  
                  try {
                    args = JSON.parse(sanitizedArgs);
                  } catch (secondError) {
                    const inputMatch = toolArguments.match(/"input"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
                    const requiresApprovalMatch = toolArguments.match(/"requires_approval"\s*:\s*(true|false)/);
                    
                    if (inputMatch) {
                      args = {
                        input: inputMatch[1].replace(/\\"/g, '"'),
                        requires_approval: requiresApprovalMatch ? 
                          requiresApprovalMatch[1] === 'true' : false
                      };
                    } else {
                      throw secondError;
                    }
                  }
                }
              }
              
              const input = args.input || "";
              const requiresApproval = args.requires_approval === true ? "true" : "false";
              const xmlToolCall = `<tool>${toolName}</tool>\n<input>${input}</input>\n<requires_approval>${requiresApproval}</requires_approval>`;
              
              yield { type: "text", text: xmlToolCall };
              
              isCollectingToolCall = false;
              toolCallId = null;
              toolName = null;
              toolArguments = null;
            } catch (error) {
              yield { type: "text", text: "Error: Failed to parse tool call. Please try again." };
            }
          }
        }

        if (chunk.usage) {
          yield {
            type: "usage",
            inputTokens: chunk.usage.prompt_tokens || 0,
            outputTokens: chunk.usage.completion_tokens || 0,
          };
        }
      }

      if (isCollectingToolCall && toolName) {
        try {
          let args;
          try {
            args = JSON.parse(toolArguments || "{}");
          } catch (parseError) {
            const jsonObjects = toolArguments.split(/(?<=\})(?=\{)/);
            if (jsonObjects.length > 1) {
              args = JSON.parse(jsonObjects[0]);
            } else {
              const sanitizedArgs = toolArguments
                .replace(/(\w+)\[name="([^"]+)"\]/g, '$1[name=\'$2\']')
                .replace(/(\w+)\[class="([^"]+)"\]/g, '$1[class=\'$2\']')
                .replace(/(\w+)\[id="([^"]+)"\]/g, '$1[id=\'$2\']')
                .replace(/(\w+)\[type="([^"]+)"\]/g, '$1[type=\'$2\']')
                .replace(/(\w+)\[value="([^"]+)"\]/g, '$1[value=\'$2\']');
              
              try {
                args = JSON.parse(sanitizedArgs);
              } catch (secondError) {
                const inputMatch = toolArguments.match(/"input"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
                const requiresApprovalMatch = toolArguments.match(/"requires_approval"\s*:\s*(true|false)/);
                
                if (inputMatch) {
                  args = {
                    input: inputMatch[1].replace(/\\"/g, '"'),
                    requires_approval: requiresApprovalMatch ? 
                      requiresApprovalMatch[1] === 'true' : false
                  };
                } else {
                  throw secondError;
                }
              }
            }
          }
          
          const input = args.input || "";
          const requiresApproval = args.requires_approval === true ? "true" : "false";
          const xmlToolCall = `<tool>${toolName}</tool>\n<input>${input}</input>\n<requires_approval>${requiresApproval}</requires_approval>`;
          
          yield { type: "text", text: xmlToolCall };
        } catch (error) {
          yield { type: "text", text: "Error: Failed to parse tool call. Please try again." };
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      yield { type: "text", text: `Error: API request failed - ${errorMsg}` };
    }
  }

  getModel(): { id: string; info: OpenAICompatibleModelInfo } {
    const modelId = this.options.apiModelId;
    const model = (this.options.openaiCompatibleModels || []).find(m => m.id === modelId);
    return {
      id: modelId || (this.options.openaiCompatibleModels[0]?.id || ''),
      info: {
        name: model?.name || modelId || '',
        inputPrice: 0,
        outputPrice: 0,
        maxTokens: model?.maxTokens || 4096,
        contextWindow: model?.contextWindow || 0,
        isReasoning: model?.isReasoningModel,
      }
    };
  }
}
