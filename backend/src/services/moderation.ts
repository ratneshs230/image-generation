import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

// List of blocked words/phrases (basic implementation)
const BLOCKED_WORDS = [
  // Violence
  'kill', 'murder', 'death', 'violence', 'blood', 'gore', 'torture',
  // Adult content
  'nude', 'naked', 'nsfw', 'porn', 'xxx', 'sexual', 'erotic',
  // Hate speech
  'hate', 'racist', 'nazi', 'discrimination',
  // Harmful
  'suicide', 'self-harm', 'drugs', 'illegal',
];

// More nuanced patterns that might indicate problematic content
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

export class ModerationService {
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.ENABLE_CONTENT_MODERATION === 'true';
  }

  // Check if a prompt contains inappropriate content
  async checkPrompt(
    prompt: string,
    userId?: string,
    roomId?: string
  ): Promise<ModerationResult> {
    const normalizedPrompt = prompt.toLowerCase().trim();

    // Check blocked words
    for (const word of BLOCKED_WORDS) {
      if (normalizedPrompt.includes(word)) {
        const result = {
          flagged: true,
          reason: `Prompt contains prohibited content: "${word}"`,
          cleanedPrompt: prompt,
        };

        await this.logModeration(roomId, userId, prompt, true, result.reason);
        return result;
      }
    }

    // Check blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(normalizedPrompt)) {
        const result = {
          flagged: true,
          reason: 'Prompt contains potentially harmful content pattern',
          cleanedPrompt: prompt,
        };

        await this.logModeration(roomId, userId, prompt, true, result.reason);
        return result;
      }
    }

    // Clean up prompt (remove extra whitespace, etc.)
    const cleanedPrompt = prompt
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500); // Max 500 characters

    // Log successful check
    await this.logModeration(roomId, userId, prompt, false, null);

    return {
      flagged: false,
      reason: null,
      cleanedPrompt,
    };
  }

  // Validate prompt length and format
  validatePromptFormat(prompt: string): { valid: boolean; error?: string } {
    if (!prompt || typeof prompt !== 'string') {
      return { valid: false, error: 'Prompt is required' };
    }

    const trimmedPrompt = prompt.trim();

    if (trimmedPrompt.length < 3) {
      return { valid: false, error: 'Prompt must be at least 3 characters' };
    }

    if (trimmedPrompt.length > 500) {
      return { valid: false, error: 'Prompt must not exceed 500 characters' };
    }

    // Check for only special characters
    if (!/[a-zA-Z0-9]/.test(trimmedPrompt)) {
      return { valid: false, error: 'Prompt must contain alphanumeric characters' };
    }

    return { valid: true };
  }

  // Log moderation decision
  private async logModeration(
    roomId: string | undefined,
    userId: string | undefined,
    prompt: string,
    flagged: boolean,
    reason: string | null
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      await prisma.moderationLog.create({
        data: {
          roomId,
          userId,
          prompt: prompt.substring(0, 1000), // Store first 1000 chars
          flagged,
          reason,
        },
      });
    } catch (error) {
      logger.error('Failed to log moderation:', error);
    }
  }

  // Get moderation statistics for admin
  async getStats(): Promise<{
    totalChecks: number;
    flaggedCount: number;
    flagRate: number;
  }> {
    const [totalChecks, flaggedCount] = await Promise.all([
      prisma.moderationLog.count(),
      prisma.moderationLog.count({ where: { flagged: true } }),
    ]);

    return {
      totalChecks,
      flaggedCount,
      flagRate: totalChecks > 0 ? (flaggedCount / totalChecks) * 100 : 0,
    };
  }

  // Get recent flagged prompts for review
  async getRecentFlagged(limit = 50) {
    return prisma.moderationLog.findMany({
      where: { flagged: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

// Singleton instance
export const moderationService = new ModerationService();
