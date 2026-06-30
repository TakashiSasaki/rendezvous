import crypto from 'crypto';

export function generateId(prefix: string, bytes = 16): string {
  return `${prefix}_${crypto.randomBytes(bytes).toString('base64url')}`;
}

export function generateOwnerEmailHash(email: string): { type: string; algorithm: string; salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('base64url');
  const hash = crypto.createHash('sha256').update(salt + email).digest('base64url');
  return {
    type: 'googleVerifiedEmailHash',
    algorithm: 'sha256-v1',
    salt,
    hash,
  };
}

export function validateRedirectUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

export function isSelfRedirect(urlString: string, host: string): boolean {
  try {
    const url = new URL(urlString);
    return url.host === host;
  } catch (e) {
    return false;
  }
}

export function isValidRedirectStatusCode(code: number): boolean {
  return [302, 303, 307].includes(code);
}
