// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Role } from '$lib/server/store';

declare global {
        namespace App {
                interface Locals {
                        user?: {
                                id: string;
                                email: string;
                                name: string;
                                role: Role;
                                lastLoginAt?: Date;
                                lastLoginResult?: 'SUCCESS' | 'FAILURE';
                        };
                }
        }
}

export {};
