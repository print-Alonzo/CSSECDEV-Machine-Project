import type { Handle } from '@sveltejs/kit';
import { destroySession, getSession, logEvent } from '$lib/server/store';

const PUBLIC_ROUTES = ['/', '/login', '/register'];
const ROLE_RESTRICTIONS: Record<string, Array<'ADMIN' | 'MANAGER' | 'CUSTOMER'>> = {
        '/admin/logs': ['ADMIN']
};

export const handle: Handle = async ({ event, resolve }) => {
        const sessionCookie = event.cookies.get('session');
        const sessionResult = getSession(sessionCookie);
        if (sessionResult) {
                event.locals.user = {
                        id: sessionResult.user.id,
                        email: sessionResult.user.email,
                        role: sessionResult.user.role,
                        name: sessionResult.user.name,
                        lastLoginAt: sessionResult.user.lastLoginAt,
                        lastLoginResult: sessionResult.user.lastLoginResult
                };
        }

        const routeId = event.route.id ?? event.url.pathname;
        const isPublic = PUBLIC_ROUTES.some((route) => routeId === route || routeId.startsWith(route + '/'));
        const user = event.locals.user;

        if (!isPublic && !user) {
                logEvent({ action: 'access.unauthenticated', outcome: 'FAILURE', detail: routeId });
                return Response.redirect(new URL('/login', event.url), 303);
        }

        const allowedRoles = ROLE_RESTRICTIONS[routeId];
        if (allowedRoles && user && !allowedRoles.includes(user.role)) {
                logEvent({ action: 'access.forbidden', outcome: 'FAILURE', userId: user.id, detail: routeId });
                return new Response('Forbidden', { status: 403 });
        }

        const response = await resolve(event);

        if (!event.locals.user && sessionCookie) {
                destroySession(sessionCookie);
                event.cookies.delete('session', { path: '/' });
        }

        return response;
};
