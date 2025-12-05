import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { authenticate, createSession, findUserByEmail, isLocked } from '$lib/server/store';

export const load: PageServerLoad = async ({ locals }) => {
        if (locals.user) throw redirect(303, '/dashboard');
        return {};
};

export const actions: Actions = {
        default: async ({ request, cookies, getClientAddress }) => {
                const form = await request.formData();
                const email = String(form.get('email') || '').toLowerCase();
                const password = String(form.get('password') || '');

                if (!email || !password) {
                        return fail(400, { error: 'Invalid username and/or password' });
                }

                const user = findUserByEmail(email);
                if (user && isLocked(user)) {
                        return fail(403, { error: 'Account temporarily locked. Please try again later.' });
                }

                const authenticated = await authenticate(email, password, getClientAddress?.());
                if (!authenticated) {
                        return fail(400, { error: 'Invalid username and/or password' });
                }

                const session = createSession(authenticated);
                cookies.set('session', session.token, {
                        path: '/',
                        httpOnly: true,
                        sameSite: 'lax',
                        secure: true,
                        maxAge: 60 * 60 * 8
                });
                throw redirect(303, '/dashboard');
        }
};
