// Generate a unique 6-character room code
const CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, I, 1)

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
  }
  return code;
}

// Validate room code format
export function isValidRoomCode(code: string): boolean {
  if (!code || code.length !== 6) return false;
  return /^[A-Z0-9]{6}$/.test(code.toUpperCase());
}
