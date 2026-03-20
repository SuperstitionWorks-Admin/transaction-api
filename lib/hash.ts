import { createHash, randomBytes } from 'crypto';

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

export function generateApiKey(): string {
  // 24 random bytes = 192 bits of entropy from a CSPRNG, hex-encoded to 48 chars.
  // Replaces the previous Date.now() + Math.random() approach which was predictable.
  return `txcat_${randomBytes(24).toString('hex')}`;
}
