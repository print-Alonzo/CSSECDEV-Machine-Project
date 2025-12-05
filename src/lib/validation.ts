import { PASSWORD_RULE_DESCRIPTION, validatePassword } from '$lib/server/security';

export function validateEmail(email: string) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
                return 'Invalid email address.';
        }
        return null;
}

export function validateName(name: string) {
        if (!name || name.trim().length < 2) {
                return 'Name must be at least 2 characters.';
        }
        if (!/^[a-zA-Z\s'.-]+$/.test(name)) {
                return 'Name contains invalid characters.';
        }
        return null;
}

export function validateOrderInput(description: string, quantity: number) {
        if (!description || description.length < 3 || description.length > 100) {
                return 'Description must be 3-100 characters.';
        }
        if (!/^[\w\s.,'-]+$/.test(description)) {
                return 'Description contains invalid characters.';
        }
        if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000) {
                return 'Quantity must be between 1 and 1000.';
        }
        return null;
}

export function validatePasswordWithPolicy(password: string) {
        const err = validatePassword(password);
        if (err) return err;
        return null;
}

export { PASSWORD_RULE_DESCRIPTION };
