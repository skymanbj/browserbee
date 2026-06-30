import { LLMProvider, StreamChunk } from "../models/providers/types";
import { TokenTrackingService } from "../tracking/tokenTrackingService";
import { ErrorHandler } from "./ErrorHandler";
import { MemoryManager } from "./MemoryManager";
import { PromptManager } from "./PromptManager";
import { trimHistory } from "./TokenManager";
import { ToolManager } from "./ToolManager";
import { requestApproval } from "./approvalManager";

// Constants
const MAX_STEPS = 50;            // prevent infinite loops
const MAX_OUTPUT_TOKENS = 1024;  // max tokens for LLM response

// Tools that always require user approval before execution, regardless of what
// the LLM says in the <requires_approval> tag. This is a safety guard against
// prompt injection or models that incorrectly mark risky actions as safe.
const SENSITIVE_TOOLS = new Set([
  "browser_navigate",
  "browser_navigate_back",
  "browser_navigate_forward",
  "browser_click",
  "browser_type",
  "browser_handle_dialog",
  "browser_click_xy",
  "browser_move_mouse",
  "browser_drag",
  "browser_press_key",
  "browser_keyboard_type",
  "browser_tab_new",
  "browser_tab_select",
  "browser_tab_close",
  "browser_navigate_tab",
  "save_memory",
  "delete_memory",
  "clear_all_memories"
]);

/**
 * Callback interface for execution
 */
export interface ExecutionCallbacks {
  onLlmChunk?: (s: string) => void;
  onLlmOutput: (s: string) => void;
  onToolOutput: (s: string) => void;
  onComplete: () => void;
  onError?: (error: any) => void;
  onToolStart?: (toolName: string, toolInput: string) => void;
  onToolEnd?: (result: string) => void;
  onSegmentComplete?: (segment: string) => void;
  onFallbackStarted?: () => void;
}

/**
 * Adapter for handling callbacks in both streaming and non-streaming modes
 */
class CallbackAdapter {
  private originalCallbacks: ExecutionCallbacks;
  private isStreaming: boolean;
  private buffer: string = '';

  constructor(callbacks: ExecutionCallbacks, isStreaming: boolean) {
    this.originalCallbacks = callbacks;
    this.isStreaming = isStreaming;
  }

  get adaptedCallbacks(): ExecutionCallbacks {
    return {
      onLlmChunk: this.handleLlmChunk.bind(this),
      onLlmOutput: this.originalCallbacks.onLlmOutput,
      onToolOutput: this.originalCallbacks.onToolOutput,
      onComplete: this.handleComplete.bind(this),
      onError: this.originalCallbacks.onError,
      onToolStart: this.originalCallbacks.onToolStart,
      onToolEnd: this.originalCallbacks.onToolEnd,
      onSegmentComplete: this.originalCallbacks.onSegmentComplete,
      onFallbackStarted: this.originalCallbacks.onFallbackStarted
    };
  }

  private handleLlmChunk(chunk: string): void {
    if (this.isStreaming && this.originalCallbacks.onLlmChunk) {
      // Pass through in streaming mode
      this.originalCallbacks.onLlmChunk(chunk);
    } else {
      // Buffer in non-streaming mode
      this.buffer += chunk;
    }
  }

  private handleComplete(): void {
    // In non-streaming mode, emit the full buffer at completion
    if (!this.isStreaming && this.buffer.length > 0) {
      this.originalCallbacks.onLlmOutput(this.buffer);
      this.buffer = '';
    }

    this.originalCallbacks.onComplete();
  }
}

/**
 * ExecutionEngine handles streaming execution logic, non-streaming execution logic,
 * and fallback mechanisms.
 */
export class ExecutionEngine {
  private llmProvider: LLMProvider;
  private toolManager: ToolManager;
  private promptManager: PromptManager;
  private memoryManager: MemoryManager;
  private errorHandler: ErrorHandler;

  constructor(
    llmProvider: LLMProvider,
    toolManager: ToolManager,
    promptManager: PromptManager,
    memoryManager: MemoryManager,
    errorHandler: ErrorHandler
  ) {
    this.llmProvider = llmProvider;
    this.toolManager = toolManager;
    this.promptManager = promptManager;
    this.memoryManager = memoryManager;
    this.errorHandler = errorHandler;
  }

  /**
   * Main execution method with fallback support
   */
  async executePromptWithFallback(
    prompt: string,
    callbacks: ExecutionCallbacks,
    initialMessages: any[] = [],
    windowId?: number
  ): Promise<void> {
    const streamingSupported = await this.errorHandler.isStreamingSupported();
    const isStreaming = streamingSupported && callbacks.onLlmChunk !== undefined;

    try {
      // Use the execution method with appropriate streaming mode
      await this.executePrompt(prompt, callbacks, initialMessages, isStreaming, windowId);
    } catch (error) {
      console.warn("Execution failed, attempting fallback:", error);

      // Notify about fallback before switching modes
      if (callbacks.onFallbackStarted) {
        callbacks.onFallbackStarted();
      }

      // Check if this is a retryable error (rate limit or overloaded)
      if (this.errorHandler.isRetryableError(error)) {
        console.log("Retryable error detected in fallback handler:", error);
        // Ensure the error callback is called even during fallback
        if (callbacks.onError) {
          callbacks.onError(error);
        }
      }

      // Continue with fallback using non-streaming mode
      await this.executePrompt(prompt, callbacks, initialMessages, false, windowId);
    }
  }

  /**
   * Helper function to decode escaped HTML entities in a string
   * @param text The text to decode
   * @returns The decoded text
   */
  private decodeHtmlEntities(text: string): string {
    // Replace Unicode escape sequences with actual characters
    return text
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\u003c/g, '<')
      .replace(/\u003e/g, '>');
  }

  /**
   * Initialize message history with the prompt
   */
  private initializeMessages(prompt: string, initialMessages: any[]): any[] {
    // Use initial messages if provided, otherwise start with just the prompt
    const messages: any[] = initialMessages.length > 0
      ? [...initialMessages]
      : [{ role: "user", content: prompt }];

    // If we have initial messages and the last one isn't the current prompt,
    // add the current prompt
    if (initialMessages.length > 0 &&
        (messages[messages.length - 1].role !== "user" ||
         messages[messages.length - 1].content !== prompt)) {
      messages.push({ role: "user", content: prompt });
    }

    return messages;
  }

  /**
   * Track token usage from stream chunks
   */
  private trackTokenUsage(
    chunk: StreamChunk,
    inputTokens: number,
    outputTokens: number,
    tokenTracker: TokenTrackingService,
    windowId?: number
  ): { updatedInputTokens: number, updatedOutputTokens: number } {
    let updatedInputTokens = inputTokens;
    let updatedOutputTokens = outputTokens;

    // Debug log to help diagnose token tracking issues
    console.debug(`Token update: input=${chunk.inputTokens || 0}, output=${chunk.outputTokens || 0}, cacheWrite=${chunk.cacheWriteTokens || 0}, cacheRead=${chunk.cacheReadTokens || 0}`);

    // Handle input tokens (only from message_start)
    if (chunk.inputTokens) {
      updatedInputTokens = chunk.inputTokens;
      // Track input tokens with cache tokens if available
      if (windowId !== undefined) {
        tokenTracker.trackInputTokens(
          updatedInputTokens,
          {
            write: chunk.cacheWriteTokens,
            read: chunk.cacheReadTokens
          },
          windowId
        );
      } else {
        tokenTracker.trackInputTokens(
          updatedInputTokens,
          {
            write: chunk.cacheWriteTokens,
            read: chunk.cacheReadTokens
          }
        );
      }
    }

    // Always track output tokens (from both message_start and message_delta)
    if (chunk.outputTokens) {
      const newOutputTokens = chunk.outputTokens;

      // Only track the delta (new tokens)
      if (newOutputTokens > updatedOutputTokens) {
        const delta = newOutputTokens - updatedOutputTokens;
        if (windowId !== undefined) {
          tokenTracker.trackOutputTokens(delta, windowId);
        } else {
          tokenTracker.trackOutputTokens(delta);
        }
        updatedOutputTokens = newOutputTokens;
      }
    }

    return { updatedInputTokens, updatedOutputTokens };
  }

  /**
   * Process the LLM stream and handle streaming chunks
   */
  private async processLlmStream(
    messages: any[],
    adaptedCallbacks: ExecutionCallbacks,
    windowId?: number
  ): Promise<{ accumulatedText: string, toolCallDetected: boolean }> {
    let accumulatedText = "";
    let streamBuffer = "";
    let toolCallDetected = false;

    // Get tools from the ToolManager
    const tools = this.toolManager.getTools();

    // Use provider interface instead of direct Anthropic API
    const stream = this.llmProvider.createMessage(
      this.promptManager.getSystemPrompt(),
      messages,
      tools
    );

    // Track token usage
    let inputTokens = 0;
    let outputTokens = 0;
    const tokenTracker = TokenTrackingService.getInstance();

    for await (const chunk of stream) {
      if (this.errorHandler.isExecutionCancelled()) break;

      // Track token usage
      if (chunk.type === 'usage') {
        const result = this.trackTokenUsage(chunk, inputTokens, outputTokens, tokenTracker, windowId);
        inputTokens = result.updatedInputTokens;
        outputTokens = result.updatedOutputTokens;
      }

      // Handle text chunks
      if (chunk.type === 'text' && chunk.text) {
        const textChunk = chunk.text;
        accumulatedText += textChunk;
        streamBuffer += textChunk;

        // Only look for complete tool calls with all three required tags
        const completeToolCallRegex = /(```(?:xml|bash)\s*)?<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>\s*<requires_approval>(.*?)<\/requires_approval>(\s*```)?/;
        const compatToolCallRegex = /(```(?:xml|bash)\s*)?<tool>(.*?)<\/tool>\s*<parameter=input>([\s\S]*?)<\/parameter>\s*<parameter=requires_approval>(.*?)<\/parameter>(?:\s*<\/function>)?(\s*```)?/;

        // Try to match standard or compatibility tool call patterns
        const completeToolCallMatch = streamBuffer.match(completeToolCallRegex);
        const compatToolCallMatch = streamBuffer.match(compatToolCallRegex);
        const match = completeToolCallMatch || compatToolCallMatch;

        // Only process complete tool calls with all three required tags
        if (match && !toolCallDetected) {
          toolCallDetected = true;
          console.log("Complete tool call detected:", match);

          // Extract the tool call
          const [, codeBlockStart, toolName, toolInput] = match;

          // Find the start of the tool call
          const matchIndex = codeBlockStart
            ? (streamBuffer.indexOf("```xml") !== -1
               ? streamBuffer.indexOf("```xml")
               : streamBuffer.indexOf("```bash"))
            : streamBuffer.indexOf("<tool>");

          // Get text before the tool call
          const textBeforeToolCall = streamBuffer.substring(0, matchIndex);

          // Finalize the current segment
          if (textBeforeToolCall.trim() && adaptedCallbacks.onSegmentComplete) {
            adaptedCallbacks.onSegmentComplete(textBeforeToolCall);
          }

          // Signal that a tool call is starting
          if (adaptedCallbacks.onToolStart) {
            adaptedCallbacks.onToolStart(toolName.trim(), toolInput.trim());
          }

          // Clear the buffer
          streamBuffer = "";

          // Don't send any more chunks until tool execution is complete
          break;
        }

        // If no tool call detected yet, continue sending chunks
        if (!toolCallDetected && adaptedCallbacks.onLlmChunk) {
          adaptedCallbacks.onLlmChunk(textChunk);
        }
      }
    }

    // After streaming completes, process the full response
    console.log("Streaming completed. Accumulated text length:", accumulatedText.length);

    // Decode any escaped HTML entities in the accumulated text
    accumulatedText = this.decodeHtmlEntities(accumulatedText);
    console.log("Decoded HTML entities in accumulated text");

    adaptedCallbacks.onLlmOutput(accumulatedText);

    return { accumulatedText, toolCallDetected };
  }

  /**
   * Execute prompt with support for both streaming and non-streaming modes
   */
  async executePrompt(
    prompt: string,
    callbacks: ExecutionCallbacks,
    initialMessages: any[] = [],
    isStreaming: boolean,
    windowId?: number
  ): Promise<void> {
    // Create adapter to handle streaming vs non-streaming
    const adapter = new CallbackAdapter(callbacks, isStreaming);
    const adaptedCallbacks = adapter.adaptedCallbacks;

    // Reset cancel flag at the start of execution
    this.errorHandler.resetCancel();
    try {
      // Initialize messages with the prompt
      let messages = this.initializeMessages(prompt, initialMessages);

      let done = false;
      let step = 0;

      while (!done && step++ < MAX_STEPS && !this.errorHandler.isExecutionCancelled()) {
        try {
          // Check for cancellation before each major step
          if (this.errorHandler.isExecutionCancelled()) break;

          // ── 1. Call LLM with streaming ───────────────────────────────────────
          const { accumulatedText } = await this.processLlmStream(messages, adaptedCallbacks, windowId);

          // Check for cancellation after LLM response
          if (this.errorHandler.isExecutionCancelled()) break;

          // Check for incomplete or malformed tool calls
          // This regex looks for tool calls that have <tool> and <input> but are missing <requires_approval>
          const incompleteApprovalRegex = /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>(?!\s*<requires_approval>)/;
          const incompleteCompatRegex = /<tool>(.*?)<\/tool>\s*<parameter=input>([\s\S]*?)<\/parameter>(?!\s*<parameter=requires_approval>)/;
          const incompleteApprovalMatch = accumulatedText.match(incompleteApprovalRegex);
          const incompleteCompatMatch = accumulatedText.match(incompleteCompatRegex);
          const incompleteMatch = incompleteApprovalMatch || incompleteCompatMatch;

          // Check for interrupted tool calls (has input tag but interrupted during requires_approval)
          const interruptedToolRegex = /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>\s*<requires(_approval)?$/;
          const interruptedCompatToolRegex = /<tool>(.*?)<\/tool>\s*<parameter=input>([\s\S]*?)<\/parameter>\s*<parameter=requires(_approval)?$/;
          const interruptedToolMatch = accumulatedText.match(interruptedToolRegex) || accumulatedText.match(interruptedCompatToolRegex);

          // Handle incomplete tool calls with missing requires_approval tag
          if (incompleteMatch && !accumulatedText.includes("<requires_approval>") && !accumulatedText.includes("<parameter=requires_approval>")) {
            const toolName = incompleteMatch[1].trim();
            const toolInput = incompleteMatch[2].trim();

            console.log("Detected incomplete tool call missing requires_approval tag:", incompleteMatch[0]);

            // Add a message to prompt the LLM to use the complete format
            messages.push(
              { role: "assistant", content: accumulatedText },
              {
                role: "user",
                content: `Error: Incomplete tool call format. You provided <tool>${toolName}</tool> and <input>${toolInput}</input> but no <requires_approval> tag. Please use the complete format with all three required tags:

<tool>tool_name</tool>
<input>arguments here</input>
<requires_approval>true or false</requires_approval>

The <requires_approval> tag is mandatory. Set it to "true" for purchases, data deletion, messages visible to others, sensitive-data forms, or any risky action. If unsure, set it to "true".`
              }
            );
            continue; // Continue to the next iteration
          }
          // Handle interrupted tool calls
          else if (interruptedToolMatch &&
              !interruptedToolMatch[0].includes("</requires_approval>") &&
              (interruptedToolMatch[0].endsWith("<requires") ||
               interruptedToolMatch[0].endsWith("<requires_approval"))) {

            const toolName = interruptedToolMatch[1].trim();
            const toolInput = interruptedToolMatch[2].trim();

            console.log("Detected interrupted tool call with partial requires_approval tag:", interruptedToolMatch[0]);

            // Instead of assuming approval, ask the LLM to complete the tool call properly
            messages.push(
              { role: "assistant", content: accumulatedText },
              {
                role: "user",
                content: `Error: Your tool call was interrupted. Please provide the complete tool call with all three required tags:

<tool>${toolName}</tool>
<input>${toolInput}</input>
<requires_approval>true or false</requires_approval>

The <requires_approval> tag is mandatory. Set it to "true" for purchases, data deletion, messages visible to others, sensitive-data forms, or any risky action. If unsure, set it to "true".`
              }
            );
            continue; // Continue to the next iteration
          }

          // ── 2. Parse for tool invocation ─────────────────────────────────────
          // Look for standard or compatibility tool call formats
          let toolMatch = accumulatedText.match(
            /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>\s*<requires_approval>(.*?)<\/requires_approval>/
          );

          if (!toolMatch) {
            toolMatch = accumulatedText.match(
              /<tool>(.*?)<\/tool>\s*<parameter=input>([\s\S]*?)<\/parameter>\s*<parameter=requires_approval>(.*?)<\/parameter>/
            );
          }

          // Check for various types of incomplete tool calls
          // 1. Tool tag without input tag
          const missingInputMatch = accumulatedText.match(/<tool>(.*?)<\/tool>(?!\s*<input>)(?!\s*<parameter=input>)/);
          // 2. Tool and input tags without requires_approval tag
          const missingApprovalMatch = accumulatedText.match(/<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>(?!\s*<requires_approval>)/) ||
                                       accumulatedText.match(/<tool>(.*?)<\/tool>\s*<parameter=input>([\s\S]*?)<\/parameter>(?!\s*<parameter=requires_approval>)/);

          if (missingInputMatch !== null && toolMatch === null) {
            // Handle tool call missing input tag
            const toolName = missingInputMatch[1].trim();
            adaptedCallbacks.onToolOutput(`⚠️ Incomplete tool call detected: ${toolName} (missing input and requires_approval tags)`);

            // Add a message to prompt the LLM to complete the tool call with all required tags
            messages.push(
              { role: "assistant", content: accumulatedText },
              {
                role: "user",
                content: `Error: Incomplete tool call. You provided <tool>${toolName}</tool> but are missing the <input> and <requires_approval> tags. Please provide the complete tool call with all three required tags:

<tool>${toolName}</tool>
<input>arguments here</input>
<requires_approval>true or false</requires_approval>

The <requires_approval> tag is mandatory. Set it to "true" for purchases, data deletion, messages visible to others, sensitive-data forms, or any risky action. If unsure, set it to "true".`
              }
            );
            continue; // Continue to the next iteration
          } else if (missingApprovalMatch !== null && toolMatch === null) {
            // Handle tool call missing requires_approval tag
            const toolName = missingApprovalMatch[1].trim();
            const toolInput = missingApprovalMatch[2].trim();
            adaptedCallbacks.onToolOutput(`⚠️ Incomplete tool call detected: ${toolName} (missing requires_approval tag)`);

            // Add a message to prompt the LLM to complete the tool call with all required tags
            messages.push(
              { role: "assistant", content: accumulatedText },
              {
                role: "user",
                content: `Error: Incomplete tool call. You provided <tool>${toolName}</tool> and <input>${toolInput}</input> but are missing the <requires_approval> tag. Please provide the complete tool call with all three required tags:

<tool>${toolName}</tool>
<input>${toolInput}</input>
<requires_approval>true or false</requires_approval>

The <requires_approval> tag is mandatory. Set it to "true" for purchases, data deletion, messages visible to others, sensitive-data forms, or any risky action. If unsure, set it to "true".`
              }
            );
            continue; // Continue to the next iteration
          }

          if (!toolMatch) {
            // Check if the LLM responded with text describing an action it intends to take
            // but forgot to use a tool - this is a common failure mode
            const actionIntentionPattern = /让我|我会|我来|我先|我想|马上|稍等|正在|好的|I'll|I will|I need to|I should|let me|需要|应该|打算|接下来/i;
            const hasActionIntention = actionIntentionPattern.test(accumulatedText);
            
            // Also check if the response is relatively short (likely a plan description, not a completion)
            const isShortResponse = accumulatedText.trim().length < 500;
            
            if (hasActionIntention && isShortResponse && !accumulatedText.includes("完成") && !accumulatedText.includes("done") && !accumulatedText.includes("summary")) {
              console.log("LLM responded with action intention but no tool call, retrying with explicit instruction");
              
              // Add the LLM's response and a corrective user message
              messages.push(
                { role: "assistant", content: accumulatedText },
                {
                  role: "user",
                  content: `Error: You described what you would do but did not actually use a tool. You MUST use a tool to perform actions. Please immediately call the appropriate tool to perform the action you described. Use the exact XML format: <tool>tool_name</tool><input>arguments</input><requires_approval>true or false</requires_approval>`
                }
              );
              continue; // Continue to the next iteration to retry
            }
            
            // no tool tag ⇒ task complete
            done = true;
            break;
          }

          // Extract tool information from the complete tool call
          let toolName, toolInput, llmRequiresApproval;

          if (toolMatch) {
            const [, toolNameRaw, toolInputRaw, requiresApprovalRaw] = toolMatch;
            toolName = toolNameRaw.trim();
            toolInput = toolInputRaw.trim();
            llmRequiresApproval = requiresApprovalRaw.trim().toLowerCase() === 'true';
          } else {
            // No valid tool call found, task is complete
            done = true;
            break;
          }
          const tool = this.toolManager.findTool(toolName);

          // Determine whether approval is required. Sensitive tools always require
          // approval as a defense-in-depth measure, even if the LLM claims otherwise.
          const isSensitiveTool = SENSITIVE_TOOLS.has(toolName);
          const requiresApproval = llmRequiresApproval || isSensitiveTool;
          let reason: string;
          if (llmRequiresApproval) {
            reason = "The AI assistant has determined this action requires your approval.";
          } else if (isSensitiveTool) {
            reason = `The ${toolName} action is classified as sensitive and requires your approval before execution.`;
          } else {
            reason = "";
          }

          if (!tool) {
            messages.push(
              { role: "assistant", content: accumulatedText },
              {
                role: "user",
                content: `Error: tool "${toolName}" not found. Available: ${this.toolManager.getTools()
                  .map((t) => t.name)
                  .join(", ")}`,
              }
            );
            continue;
          }

          // Check for cancellation before tool execution
          if (this.errorHandler.isExecutionCancelled()) break;

          // ── 3. Execute tool ──────────────────────────────────────────────────
          adaptedCallbacks.onToolOutput(`🕹️ tool: ${toolName} | args: ${toolInput}`);

          let result: string;

          if (requiresApproval) {
            // Notify the user that approval is required
            adaptedCallbacks.onToolOutput(`⚠️ This action requires approval: ${reason}`);

            // Get the current tab ID from chrome.tabs API
            const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            const tabId = tabs[0]?.id || 0;

            try {
              // Request approval from the user
              const approved = await requestApproval(tabId, toolName, toolInput, reason);

              if (approved) {
                // User approved, execute the tool
                adaptedCallbacks.onToolOutput(`✅ Action approved by user. Executing...`);

                // Create a context object to pass to the tool
                const context = {
                  requiresApproval: true,
                  approvalReason: reason
                };

                // Execute the tool with the context
                result = await tool.func(toolInput, context);
              } else {
                // User rejected, skip execution
                result = "Action cancelled by user.";
                adaptedCallbacks.onToolOutput(`❌ Action rejected by user.`);
              }
            } catch (approvalError) {
              console.error(`Error in approval process:`, approvalError);
              result = "Error in approval process. Action cancelled.";
              adaptedCallbacks.onToolOutput(`❌ Error in approval process: ${approvalError}`);
            }
          } else {
            // No approval required, execute the tool normally
            result = await tool.func(toolInput);
          }

          // Signal that tool execution is complete
          if (adaptedCallbacks.onToolEnd) {
            adaptedCallbacks.onToolEnd(result);
          }

          // Check for cancellation after tool execution
          if (this.errorHandler.isExecutionCancelled()) break;

          // ── 4. Record turn & prune history ───────────────────────────────────
          messages.push(
            { role: "assistant", content: accumulatedText }
          );

          // Add the tool result to the message history
          try {
            // Try to parse the result as JSON to handle special formats
            const parsedResult = JSON.parse(result);

            // Handle screenshot references
            if (parsedResult.type === "screenshotRef" && parsedResult.id) {
              // Create a message for the LLM with the screenshot reference
              // The actual screenshot display is handled by agentController.ts
              messages.push({
                role: "user",
                content: `Tool result: Screenshot captured (${parsedResult.id}). ${parsedResult.note || ''} Based on this image, please answer the user's original question: "${prompt}". Don't just describe the image - focus on answering the specific question or completing the task the user asked for.`
              });
            } else {
              // For other JSON results, stringify them nicely
              messages.push({
                role: "user",
                content: `Tool result: ${JSON.stringify(parsedResult, null, 2)}`
              });
            }
          } catch (error) {
            // If not valid JSON, add as plain text
            messages.push({ role: "user", content: `Tool result: ${result}` });
          }

          messages = trimHistory(messages);
        } catch (error) {
          // If an error occurs during execution, check if it was due to cancellation
          if (this.errorHandler.isExecutionCancelled()) break;
          throw error; // Re-throw if it wasn't a cancellation
        }
      }

      if (this.errorHandler.isExecutionCancelled()) {
        adaptedCallbacks.onLlmOutput(
          `\n\nExecution cancelled by user.`
        );
      } else if (step >= MAX_STEPS) {
        adaptedCallbacks.onLlmOutput(
          `Stopped: exceeded maximum of ${MAX_STEPS} steps.`
        );
      }
      adaptedCallbacks.onComplete();
    } catch (err: any) {
      // Check if this is a retryable error (rate limit or overloaded)
      if (this.errorHandler.isRetryableError(err)) {
        console.log("Retryable error detected:", err);
        // For retryable errors, notify but don't complete processing
        // This allows the fallback mechanism to retry while maintaining UI state
        if (adaptedCallbacks.onError) {
          adaptedCallbacks.onError(err);
        } else {
          adaptedCallbacks.onLlmOutput(this.errorHandler.formatErrorMessage(err));
        }

        // Notify about fallback before re-throwing
        if (adaptedCallbacks.onFallbackStarted) {
          adaptedCallbacks.onFallbackStarted();
        }

        // Get retry attempt from error if available, or default to 0
        const retryAttempt = (err as any).retryAttempt || 0;

        // Maximum number of retry attempts
        const MAX_RETRY_ATTEMPTS = 5;

        if (retryAttempt < MAX_RETRY_ATTEMPTS && !isStreaming) {
          // Only retry in non-streaming mode
          // Calculate backoff time using the ErrorHandler
          const backoffTime = this.errorHandler.calculateBackoffTime(err, retryAttempt);

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, backoffTime));

          // Notify that we're retrying
          const errorType = this.errorHandler.isOverloadedError(err) ? 'server overload' : 'rate limit';
          adaptedCallbacks.onToolOutput(`Retrying after ${errorType} error (attempt ${retryAttempt + 1} of ${MAX_RETRY_ATTEMPTS})...`);

          // Increment retry attempt for the next try
          (err as any).retryAttempt = retryAttempt + 1;

          // Recursive retry with the same parameters
          return this.executePrompt(prompt, callbacks, initialMessages, isStreaming, windowId);
        } else if (retryAttempt >= MAX_RETRY_ATTEMPTS) {
          // We've exceeded the maximum number of retry attempts
          adaptedCallbacks.onLlmOutput(
            `Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded. Please try again later.`
          );
          adaptedCallbacks.onComplete();
        } else {
          // In streaming mode, re-throw to trigger fallback
          throw err;
        }
      } else {
        // For other errors, show error message
        adaptedCallbacks.onLlmOutput(
          `Fatal error: ${err instanceof Error ? err.message : String(err)}`
        );

        // In streaming mode, re-throw to trigger fallback WITHOUT completing
        if (isStreaming) {
          throw err;
        } else {
          // Only complete processing if we're not going to fallback
          adaptedCallbacks.onComplete();
        }
      }
    }
  }
}
