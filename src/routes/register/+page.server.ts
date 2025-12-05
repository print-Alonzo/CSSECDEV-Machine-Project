import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createUser, createSession, logEvent } from '$lib/server/store';
import { validateEmail, validateName, validatePasswordWithPolicy } from '$lib/validation';

export const load: PageServerLoad = async ({ locals }) => {
        if (locals.user) throw redirect(303, '/dashboard');
        return {};
};

export const actions: Actions = {
        default: async ({ request, cookies }) => {
                const form = await request.formData();
                const email = String(form.get('email') || '').trim();
                const name = String(form.get('name') || '').trim();
                const password = String(form.get('password') || '');
                const confirm = String(form.get('confirm') || '');

                const emailErr = validateEmail(email);
                const nameErr = validateName(name);
                const passwordErr = validatePasswordWithPolicy(password);
                const validationError = emailErr || nameErr || passwordErr;
                if (validationError) {
                        logEvent({ action: 'validation.register', outcome: 'FAILURE', detail: validationError });
                        return fail(400, { error: validationError });
                }
                if (password !== confirm) {
                        logEvent({ action: 'validation.register', outcome: 'FAILURE', detail: 'Password mismatch' });
                        return fail(400, { error: 'Passwords do not match.' });
                }

                try {
                        const user = await createUser({ email, name, password });
                        const session = createSession(user);
                        cookies.set('session', session.token, {
                                path: '/',
                                httpOnly: true,
                                sameSite: 'lax',
                                secure: true,
                                maxAge: 60 * 60 * 8
                        });
                        throw redirect(303, '/dashboard');
                } catch (err) {
                        logEvent({ action: 'user.register', outcome: 'FAILURE', detail: 'Duplicate or invalid data' });
                        return fail(400, { error: 'Unable to register with those details.' });
                }
        }
};
