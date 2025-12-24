import prisma from './prisma';

const BLOCKED_WORDS = [
  'kill', 'murder', 'death', 'violence', 'blood', 'gore', 'torture',
  'nude', 'naked', 'nsfw', 'porn', 'xxx', 'sexual', 'erotic',
  'hate', 'racist', 'nazi', 'discrimination',
  'suicide', 'self-harm', 'drugs', 'illegal',
];

const BLOCKED_PATTERNS = [
  /\b(kill|murder|hurt)\s+(people|person|someone|child|children)/i,
  /\b(nude|naked)\s+(woman|man|person|child|children)/i,
  /\bexplicit\s+(content|image|picture)/i,
  /\b(child|children)\s+in\s+(danger|trouble)/i,
];

export interface ModerationResult {
  flagged: boolean;
  reason: string | null;
  cleanedPrompt: string;
}

export async function checkPrompt(
  prompt: string,
  userId?: string,
  roomId?: string
): Promise<ModerationResult> {
  const normalizedPrompt = prompt.toLowerCase().trim();

  // Check blocked words
  for (const word of BLOCKED_WORDS) {
    if (normalizedPrompt.includes(word)) {
      await logModeration(roomId, userId, prompt, true, `Contains: "${word}"`);
      return {
        flagged: true,
        reason: `Prompt contains prohibited content`,
        cleanedPrompt: prompt,
      };
    }
  }

  // Check blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalizedPrompt)) {
      await logModeration(roomId, userId, prompt, true, 'Harmful pattern detected');
      return {
        flagged: true,
        reason: 'Prompt contains potentially harmful content',
        cleanedPrompt: prompt,
      };
    }
  }

  // Clean up prompt
  const cleanedPrompt = prompt.replace(/\s+/g, ' ').trim().substring(0, 500);

  await logModeration(roomId, userId, prompt, false, null);

  return {
    flagged: false,
    reason: null,
    cleanedPrompt,
  };
}

export function validatePromptFormat(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: 'Prompt is required' };
  }

  const trimmed = prompt.trim();

  if (trimmed.length < 3) {
    return { valid: false, error: 'Prompt must be at least 3 characters' };
  }

  if (trimmed.length > 500) {
    return { valid: false, error: 'Prompt must not exceed 500 characters' };
  }

  if (!/[a-zA-Z0-9]/.test(trimmed)) {
    return { valid: false, error: 'Prompt must contain alphanumeric characters' };
  }

  return { valid: true };
}

async function logModeration(
  roomId: string | undefined,
  userId: string | undefined,
  prompt: string,
  flagged: boolean,
  reason: string | null
): Promise<void> {
  try {
    await prisma.moderationLog.create({
      data: {
        roomId,
        userId,
        prompt: prompt.substring(0, 1000),
        flagged,
        reason,
      },
    });
  } catch (error) {
    console.error('Failed to log moderation:', error);
  }
}
