const BLOCKED_WORDS = [
  'kill', 'murder', 'death', 'violence', 'blood', 'gore', 'torture',
  'nude', 'naked', 'nsfw', 'porn', 'xxx', 'sexual', 'erotic',
  'hate', 'racist', 'nazi', 'discrimination',
  'suicide', 'self-harm', 'drugs', 'illegal',
];

const BLOCKED_PATTERNS = [
  /(kill|murder|hurt)s+(people|person|someone|child|children)/i,
  /(nude|naked)s+(woman|man|person|child|children)/i,
  /explicits+(content|image|picture)/i,
  /(child|children)s+ins+(danger|trouble)/i,
];

export interface ModerationResult {
  safe: boolean;
  reason: string | null;
}

export function moderateContent(prompt: string): ModerationResult {
  const normalizedPrompt = prompt.toLowerCase().trim();

  // Check blocked words
  for (const word of BLOCKED_WORDS) {
    if (normalizedPrompt.includes(word)) {
      return {
        safe: false,
        reason: 'Prompt contains prohibited content',
      };
    }
  }

  // Check blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalizedPrompt)) {
      return {
        safe: false,
        reason: 'Prompt contains potentially harmful content',
      };
    }
  }

  // Check length
  if (prompt.length > 500) {
    return {
      safe: false,
      reason: 'Prompt must not exceed 500 characters',
    };
  }

  if (prompt.trim().length < 3) {
    return {
      safe: false,
      reason: 'Prompt must be at least 3 characters',
    };
  }

  return {
    safe: true,
    reason: null,
  };
}

