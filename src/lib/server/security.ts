import { randomBytes, scryptSync, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const PASSWORD_POLICY = {
        minLength: 10,
        regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/
};

export function validatePassword(password: string): string | null {
        if (!password || password.length < PASSWORD_POLICY.minLength) {
                return `Password must be at least ${PASSWORD_POLICY.minLength} characters long.`;
        }
        if (!PASSWORD_POLICY.regex.test(password)) {
                return 'Password must include uppercase, lowercase, digit, and special character.';
        }
        return null;
}

export function hashPasswordSync(password: string): string {
        const salt = randomBytes(16);
        const derivedKey = scryptSync(password, salt, 64);
        return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

export async function hashPassword(password: string): Promise<string> {
        const salt = randomBytes(16);
        const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
        return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
        const [saltHex, keyHex] = hash.split(':');
        if (!saltHex || !keyHex) return false;
        const salt = Buffer.from(saltHex, 'hex');
        const storedKey = Buffer.from(keyHex, 'hex');
        const derivedKey = (await scryptAsync(password, salt, storedKey.length)) as Buffer;
        return timingSafeEqual(storedKey, derivedKey);
}

export const PASSWORD_RULE_DESCRIPTION =
        'Min 10 chars with uppercase, lowercase, number, and special character';
