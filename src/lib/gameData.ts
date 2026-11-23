// Game Data & Cryptographic Utilities

export interface TeamGroupConfig {
  groupId: number;
  teams: number[];
  originalString: string;
  fragmentCode: string;
  secretWord: string;
  finalCodeword: 'ALPHA' | 'SIGMA' | 'THETA' | 'DELTA';
}

export const TEAM_GROUPS: TeamGroupConfig[] = [
  {
    groupId: 1,
    teams: [1, 7, 5, 9, 3, 8],
    originalString: 'YOUR ACCESS CODE IS 4T2 AND WORD  IS AURORA',
    fragmentCode: '4T2',
    secretWord: 'AURORA',
    finalCodeword: 'ALPHA',
  },
  {
    groupId: 2,
    teams: [2, 10, 4, 11, 13, 18],
    originalString: 'YOUR ACCESS CODE IS 8X3 AND WORD IS VECTOR',
    fragmentCode: '8X3',
    secretWord: 'VECTOR',
    finalCodeword: 'SIGMA',
  },
  {
    groupId: 3,
    teams: [6, 12, 15, 17, 20, 21],
    originalString: 'YOUR ACCESS CODE IS 6C3 AND WORD IS THUNDER',
    fragmentCode: '6C3',
    secretWord: 'THUNDER',
    finalCodeword: 'THETA',
  },
  {
    groupId: 4,
    teams: [], // All remaining teams
    originalString: 'YOUR ACCESS CODE IS 5U2 AND WORD IS ZIGZAG',
    fragmentCode: '5U2',
    secretWord: 'ZIGZAG',
    finalCodeword: 'DELTA',
  },
];

// Extract integer team number from string like "TEAM 1", "team 02", "Team-5", "12"
export function extractTeamNumber(teamName: string): number | null {
  const match = teamName.match(/\d+/);
  if (!match) return null;
  const num = parseInt(match[0], 10);
  return isNaN(num) ? null : num;
}

// Get the team group config by team number
export function getTeamGroup(teamNumber: number): TeamGroupConfig {
  for (let i = 0; i < 3; i++) {
    if (TEAM_GROUPS[i].teams.includes(teamNumber)) {
      return TEAM_GROUPS[i];
    }
  }
  // Group 4 for any remaining teams
  return TEAM_GROUPS[3];
}

// ROT13 cipher for letters (A-Z, a-z)
export function rot13(str: string): string {
  return str.replace(/[a-zA-Z]/g, (char) => {
    const code = char.charCodeAt(0);
    const base = code >= 97 ? 97 : 65;
    return String.fromCharCode(((code - base + 13) % 26) + base);
  });
}

// ROT5 cipher for numbers 0-9
export function rot5(str: string): string {
  return str.replace(/[0-9]/g, (char) => {
    const code = char.charCodeAt(0);
    return String.fromCharCode(((code - 48 + 5) % 10) + 48);
  });
}

// String to Hexadecimal
export function stringToHex(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    hex += code.toString(16).padStart(2, '0');
  }
  return hex;
}

// Hexadecimal to String
export function hexToString(hex: string): string {
  let cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  if (cleanHex.length % 2 !== 0) {
    cleanHex = cleanHex.slice(0, -1);
  }
  let str = '';
  for (let i = 0; i < cleanHex.length; i += 2) {
    const byte = parseInt(cleanHex.substring(i, i + 2), 16);
    if (!isNaN(byte)) {
      str += String.fromCharCode(byte);
    }
  }
  return str;
}

// String to Base64 (browser & node safe)
export function stringToBase64(str: string): string {
  if (typeof window !== 'undefined' && window.btoa) {
    try {
      return window.btoa(unescape(encodeURIComponent(str)));
    } catch {
      // fallback
    }
  }
  return Buffer.from(str, 'utf-8').toString('base64');
}

// Base64 to String (browser & node safe)
export function base64ToString(b64: string): string {
  try {
    if (typeof window !== 'undefined' && window.atob) {
      return decodeURIComponent(escape(window.atob(b64.trim())));
    }
    return Buffer.from(b64.trim(), 'base64').toString('utf-8');
  } catch {
    return 'INVALID_BASE64_SEQUENCE';
  }
}

// Encode pipeline: Original -> ROT13 -> Hex -> Base64
export function generateInitialStage2Code(teamNumber: number): {
  originalString: string;
  rot13String: string;
  hexString: string;
  base64String: string;
} {
  const group = getTeamGroup(teamNumber);
  const original = group.originalString;
  const r13 = rot13(original);
  const hex = stringToHex(r13);
  const b64 = stringToBase64(hex);

  return {
    originalString: original,
    rot13String: r13,
    hexString: hex,
    base64String: b64,
  };
}

// Decoy / Glitch transformations
export function generateDecoyJunk(type: string, currentString: string): string {
  const seed = currentString.length;
  switch (type.toLowerCase()) {
    case 'rot5': {
      // Scramble with rot5 plus random symbols
      return rot5(currentString)
        .split('')
        .map((c, i) => (i % 3 === 0 ? String.fromCharCode(33 + ((c.charCodeAt(0) + seed + i) % 14)) : c))
        .join('');
    }
    case 'octal': {
      let out = '';
      for (let i = 0; i < Math.min(currentString.length, 30); i++) {
        out += (currentString.charCodeAt(i) % 8).toString() + (currentString.charCodeAt(i) * 3 % 8) + ' ';
      }
      return out.trim() + ' [OCT_CORRUPT]';
    }
    case 'binary': {
      let bin = '';
      for (let i = 0; i < Math.min(currentString.length, 12); i++) {
        bin += currentString.charCodeAt(i).toString(2).padStart(8, '0') + ' ';
      }
      return bin.trim() + '... [STREAM_ERR]';
    }
    case 'atbash': {
      return currentString
        .split('')
        .map((c) => {
          const code = c.charCodeAt(0);
          if (code >= 65 && code <= 90) return String.fromCharCode(90 - (code - 65));
          if (code >= 97 && code <= 122) return String.fromCharCode(122 - (code - 97));
          return c;
        })
        .join('') + ' [INVERTED_PARITY]';
    }
    case 'caesar7': {
      return currentString.replace(/[a-zA-Z]/g, (char) => {
        const code = char.charCodeAt(0);
        const base = code >= 97 ? 97 : 65;
        return String.fromCharCode(((code - base + 7) % 26) + base);
      }) + ' ~!#';
    }
    default: {
      const glitched = ['§', '¶', '∆', '¥', '≈', '≠', '≤', '≥', '¿', '‰', '‡'];
      return currentString
        .split('')
        .map((ch, i) => (i % 2 === 0 ? glitched[(ch.charCodeAt(0) + i) % glitched.length] : ch))
        .join('');
    }
  }
}

// Stage 3 Validation
export interface Stage3ValidationResult {
  isValid: boolean;
  hasMinWords: boolean;
  wordCount: number;
  hasRoleIntro: boolean;
  hasVaultRequest: boolean;
  hasFragmentCode: boolean;
  hasSecretWord: boolean;
  extractedRole?: string;
  errorMessage?: string;
  assignedCodeword: 'ALPHA' | 'SIGMA' | 'THETA' | 'DELTA';
}

export function validateStage3Sentence(teamNumber: number, sentence: string): Stage3ValidationResult {
  const group = getTeamGroup(teamNumber);
  const cleanSentence = sentence.trim();

  // 1. Check minimum 15 words
  const words = cleanSentence.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const hasMinWords = wordCount >= 15;

  // 2. Check for "i am " or "i'm " pattern with a role
  // e.g., "i am commander...", "i am an engineer...", "I am agent 007..."
  const roleRegex = /\b(?:i\s*am|i['’]m)\s+([a-zA-Z0-9_\-\s]{2,30}?)(?=\s+(?:and|with|having|code|secret|my|,|\.|$))/i;
  const broadIntroRegex = /\b(?:i\s*am|i['’]m)\s+([a-zA-Z0-9_\-]+)/i;
  
  const roleMatch = cleanSentence.match(roleRegex) || cleanSentence.match(broadIntroRegex);
  const hasRoleIntro = !!roleMatch;
  const extractedRole = roleMatch ? roleMatch[1].trim() : undefined;

  // 3. Check for formal vault access request
  // e.g., "request to grant access to the vault", "grant access to the vault", "request access to vault"
  const vaultRequestPattern = /(?:grant|request(?:ing)?|ask(?:\s+to)?|seek|petition)\s+(?:(?:me|us)\s+)?(?:to\s+grant\s+)?access\s+to\s+(?:the\s+)?vault/i;
  const fallbackVaultPattern = /\baccess\s+to\s+(?:the\s+)?vault\b/i;
  const hasVaultRequest = vaultRequestPattern.test(cleanSentence) || fallbackVaultPattern.test(cleanSentence);

  // 4. Check fragment code (case-insensitive)
  const fragmentCodeRegex = new RegExp(`\\b${group.fragmentCode}\\b`, 'i');
  const hasFragmentCode = fragmentCodeRegex.test(cleanSentence) || cleanSentence.toLowerCase().includes(group.fragmentCode.toLowerCase());

  // 5. Check secret word (case-insensitive)
  const secretWordRegex = new RegExp(`\\b${group.secretWord}\\b`, 'i');
  const hasSecretWord = secretWordRegex.test(cleanSentence) || cleanSentence.toLowerCase().includes(group.secretWord.toLowerCase());

  let errorMessage: string | undefined = undefined;
  if (!hasMinWords) {
    errorMessage = `Security Officer: Dispatch rejected. Statement contains only ${wordCount}/15 words. Minimum 15 words required.`;
  } else if (!hasRoleIntro) {
    errorMessage = 'Security Officer: Identification rejected. You must assign yourself an operational role using an "I am [role]" statement.';
  } else if (!hasVaultRequest) {
    errorMessage = 'Security Officer: Protocol rejected. You must formally request to grant access to the vault (e.g. "...request to grant access to the vault").';
  } else if (!hasFragmentCode || !hasSecretWord) {
    errorMessage = 'Security Officer: Access denied. Missing or invalid cryptographic keys from previous stages.';
  }

  const isValid = hasMinWords && hasRoleIntro && hasVaultRequest && hasFragmentCode && hasSecretWord;

  return {
    isValid,
    hasMinWords,
    wordCount,
    hasRoleIntro,
    hasVaultRequest,
    hasFragmentCode,
    hasSecretWord,
    extractedRole,
    errorMessage,
    assignedCodeword: group.finalCodeword,
  };
}
