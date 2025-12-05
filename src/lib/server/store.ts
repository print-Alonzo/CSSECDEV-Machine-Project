import { randomBytes } from 'crypto';
import { hashPassword, hashPasswordSync, verifyPassword } from './security';

export type Role = 'ADMIN' | 'MANAGER' | 'CUSTOMER';

export interface User {
        id: string;
        email: string;
        name: string;
        role: Role;
        passwordHash: string;
        passwordHistory: { hash: string; changedAt: Date }[];
        passwordChangedAt: Date;
        failedAttempts: number;
        lockUntil?: Date;
        lastLoginAt?: Date;
        lastLoginResult?: 'SUCCESS' | 'FAILURE';
}

export interface Session {
        token: string;
        userId: string;
        createdAt: Date;
        lastSeenAt: Date;
}

export interface Order {
        id: string;
        ownerId: string;
        description: string;
        quantity: number;
        status: 'PENDING' | 'APPROVED' | 'CANCELLED';
        createdAt: Date;
}

export interface LogEntry {
        id: string;
        userId?: string;
        action: string;
        outcome: 'SUCCESS' | 'FAILURE';
        detail?: string;
        ip?: string;
        createdAt: Date;
}

const users = new Map<string, User>();
const sessions = new Map<string, Session>();
const orders = new Map<string, Order>();
const logs: LogEntry[] = [];

const PASSWORD_HISTORY_LIMIT = 3;
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 10;
const MIN_PASSWORD_AGE_MS = 24 * 60 * 60 * 1000; // 1 day

seedInitialData();

function seedInitialData() {
        if (users.size > 0) return;
        const adminPassword = hashPasswordSync('AdminStrong!1');
        const adminId = generateId();
        const now = new Date();
        const admin: User = {
                id: adminId,
                email: 'admin@example.com',
                name: 'Admin User',
                role: 'ADMIN',
                passwordHash: adminPassword,
                passwordHistory: [{ hash: adminPassword, changedAt: now }],
                passwordChangedAt: now,
                failedAttempts: 0,
                lastLoginAt: undefined,
                lastLoginResult: undefined
        };
        users.set(admin.email, admin);
}

export function generateId() {
        return randomBytes(16).toString('hex');
}

export function logEvent(entry: Omit<LogEntry, 'id' | 'createdAt'>) {
        logs.unshift({ ...entry, id: generateId(), createdAt: new Date() });
        if (logs.length > 5000) {
                logs.pop();
        }
}

export function listLogs(limit = 200) {
        return logs.slice(0, limit);
}

export function findUserByEmail(email: string): User | undefined {
        return users.get(email.toLowerCase());
}

export async function createUser(params: {
        email: string;
        name: string;
        role?: Role;
        password: string;
}): Promise<User> {
        const email = params.email.toLowerCase();
        const existing = users.get(email);
        if (existing) {
                throw new Error('User already exists');
        }
        const passwordHash = await hashPassword(params.password);
        const now = new Date();
        const user: User = {
                id: generateId(),
                email,
                name: params.name,
                role: params.role ?? 'CUSTOMER',
                passwordHash,
                passwordHistory: [{ hash: passwordHash, changedAt: now }],
                passwordChangedAt: now,
                failedAttempts: 0
        };
        users.set(email, user);
        logEvent({
                action: 'user.register',
                outcome: 'SUCCESS',
                userId: user.id,
                detail: `Registered ${email}`
        });
        return user;
}

export function recordLoginFailure(user: User, ip?: string) {
        user.failedAttempts += 1;
        user.lastLoginAt = new Date();
        user.lastLoginResult = 'FAILURE';
        if (user.failedAttempts >= LOCKOUT_THRESHOLD) {
                user.lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        }
        logEvent({
                action: 'auth.login',
                outcome: 'FAILURE',
                userId: user.id,
                ip,
                detail: `Failed attempts: ${user.failedAttempts}`
        });
}

export function recordLoginSuccess(user: User, ip?: string) {
        user.failedAttempts = 0;
        user.lockUntil = undefined;
        user.lastLoginAt = new Date();
        user.lastLoginResult = 'SUCCESS';
        logEvent({ action: 'auth.login', outcome: 'SUCCESS', userId: user.id, ip });
}

export function isLocked(user: User) {
        return user.lockUntil ? user.lockUntil.getTime() > Date.now() : false;
}

export function createSession(user: User): Session {
        const token = randomBytes(32).toString('hex');
        const session: Session = { token, userId: user.id, createdAt: new Date(), lastSeenAt: new Date() };
        sessions.set(token, session);
        return session;
}

export function destroySession(token?: string) {
        if (token) {
                sessions.delete(token);
        }
}

export function getSession(token?: string) {
        if (!token) return undefined;
        const session = sessions.get(token);
        if (!session) return undefined;
        session.lastSeenAt = new Date();
        const user = [...users.values()].find((u) => u.id === session.userId);
        if (!user) {
                sessions.delete(token);
                return undefined;
        }
        return { session, user } as const;
}

export function getUserById(id: string) {
        return [...users.values()].find((u) => u.id === id);
}

export async function authenticate(email: string, password: string, ip?: string) {
        const user = users.get(email.toLowerCase());
        if (!user) return undefined;
        if (isLocked(user)) {
                logEvent({ action: 'auth.login', outcome: 'FAILURE', userId: user.id, ip, detail: 'Locked' });
                return undefined;
        }
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) {
                recordLoginFailure(user, ip);
                return undefined;
        }
        recordLoginSuccess(user, ip);
        return user;
}

export async function updatePassword(user: User, currentPassword: string, newPassword: string) {
        const now = Date.now();
        const ageMs = now - user.passwordChangedAt.getTime();
        if (ageMs < MIN_PASSWORD_AGE_MS) {
                throw new Error('Password was changed too recently.');
        }
        const matches = await verifyPassword(currentPassword, user.passwordHash);
        if (!matches) {
                throw new Error('Current password is incorrect.');
        }
        const reused = await Promise.all(user.passwordHistory.map((p) => verifyPassword(newPassword, p.hash)));
        if (reused.some(Boolean)) {
                throw new Error('Cannot reuse a previous password.');
        }
        const newHash = await hashPassword(newPassword);
        user.passwordHash = newHash;
        user.passwordChangedAt = new Date();
        user.passwordHistory.unshift({ hash: newHash, changedAt: user.passwordChangedAt });
        if (user.passwordHistory.length > PASSWORD_HISTORY_LIMIT) {
                user.passwordHistory.length = PASSWORD_HISTORY_LIMIT;
        }
        logEvent({ action: 'user.password.change', outcome: 'SUCCESS', userId: user.id });
}

export function listOrdersForUser(user: Pick<User, 'id' | 'role'>) {
        if (user.role === 'ADMIN') {
                return Array.from(orders.values());
        }
        if (user.role === 'MANAGER') {
                return Array.from(orders.values());
        }
        return Array.from(orders.values()).filter((o) => o.ownerId === user.id);
}

export function addOrder(owner: Pick<User, 'id'>, data: { description: string; quantity: number }) {
        const order: Order = {
                id: generateId(),
                ownerId: owner.id,
                description: data.description,
                quantity: data.quantity,
                status: 'PENDING',
                createdAt: new Date()
        };
        orders.set(order.id, order);
        logEvent({ action: 'order.create', outcome: 'SUCCESS', userId: owner.id, detail: order.id });
        return order;
}

export function updateOrder(
        user: Pick<User, 'id' | 'role'>,
        id: string,
        data: Partial<Pick<Order, 'description' | 'quantity' | 'status'>>
) {
        const order = orders.get(id);
        if (!order) return undefined;
        const ownsOrder = order.ownerId === user.id;
        const canManage = user.role === 'ADMIN' || user.role === 'MANAGER' || ownsOrder;
        if (!canManage) return undefined;
        if (data.description !== undefined) order.description = data.description;
        if (data.quantity !== undefined) order.quantity = data.quantity;
        if (data.status !== undefined) order.status = data.status;
        logEvent({ action: 'order.update', outcome: 'SUCCESS', userId: user.id, detail: id });
        return order;
}

export function deleteOrder(user: Pick<User, 'id' | 'role'>, id: string) {
        const order = orders.get(id);
        if (!order) return false;
        const ownsOrder = order.ownerId === user.id;
        const canDelete = user.role === 'ADMIN' || user.role === 'MANAGER' || ownsOrder;
        if (!canDelete) return false;
        orders.delete(id);
        logEvent({ action: 'order.delete', outcome: 'SUCCESS', userId: user.id, detail: id });
        return true;
}

