import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';

interface ClaudeOptions {
  model?: 'claude-sonnet-4-6' | 'claude-haiku-4-5-20251001' | 'claude-opus-4-6';
  systemPrompt?: string;
}

const DEFAULT_MODEL = 'claude-sonnet-4-6';

/**
 * Simple text completion — send a prompt, get a string back.
 * Uses the Claude Agent SDK which reads credentials from ~/.claude/.credentials.json automatically.
 */
export async function claude(
  prompt: string,
  opts: ClaudeOptions = {}
): Promise<string> {
  const fullPrompt = opts.systemPrompt
    ? `${opts.systemPrompt}\n\n${prompt}`
    : prompt;

  const q = query({
    prompt: fullPrompt,
    options: {
      model: opts.model ?? DEFAULT_MODEL,
      allowedTools: [],
      maxTurns: 1,
    },
  });

  let resultText = '';
  for await (const message of q) {
    if (message.type === 'result' && message.subtype === 'success') {
      resultText = message.result;
    }
  }

  return resultText;
}

/**
 * JSON completion — send a prompt, get parsed JSON back.
 */
export async function claudeJSON<T = unknown>(
  prompt: string,
  opts: ClaudeOptions = {}
): Promise<T> {
  const systemPrompt = [
    opts.systemPrompt,
    'You MUST respond with valid JSON only. No markdown, no code fences, no explanation — just the JSON object.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const text = await claude(prompt, { ...opts, systemPrompt });

  // Strip any accidental code fences
  const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  return JSON.parse(cleaned) as T;
}

/**
 * Streaming completion — yields text chunks as they arrive via the SDK's AsyncGenerator.
 */
export async function* claudeStream(
  prompt: string,
  opts: ClaudeOptions = {}
): AsyncGenerator<string> {
  const fullPrompt = opts.systemPrompt
    ? `${opts.systemPrompt}\n\n${prompt}`
    : prompt;

  const q = query({
    prompt: fullPrompt,
    options: {
      model: opts.model ?? DEFAULT_MODEL,
      allowedTools: [],
      maxTurns: 1,
    },
  });

  for await (const message of q) {
    if (message.type === 'assistant') {
      // Extract text blocks from the assistant message
      const msg = message as SDKMessage & { message?: { content?: Array<{ type: string; text?: string }> } };
      if (msg.message?.content) {
        for (const block of msg.message.content) {
          if (block.type === 'text' && block.text) {
            yield block.text;
          }
        }
      }
    }
  }
}
