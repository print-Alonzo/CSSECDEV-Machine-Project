import { destroySession } from '$lib/server/store';
import type { Actions, LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
        return { user: locals.user };
};

export const actions: Actions = {
        logout: async ({ cookies }) => {
                const token = cookies.get('session');
                destroySession(token);
                cookies.delete('session', { path: '/' });
                return { success: true };
        }
};
