import { destroySession } from '$lib/server/store';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
        const token = cookies.get('session');
        destroySession(token);
        cookies.delete('session', { path: '/' });

        return new Response(null, {
                status: 303,
                headers: {
                        location: '/login'
                }
        });
};
