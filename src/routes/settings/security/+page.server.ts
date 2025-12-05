import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { findUserByEmail, updatePassword } from '$lib/server/store';
import { validatePasswordWithPolicy } from '$lib/validation';

export const load: PageServerLoad = async ({ locals }) => {
        if (!locals.user) {
                        throw fail(401, { error: 'Unauthorized' });
        }
        return { user: locals.user };
};

export const actions: Actions = {
        changePassword: async ({ locals, request }) => {
                if (!locals.user) return fail(401, { error: 'Unauthorized' });
                const form = await request.formData();
                const current = String(form.get('current') || '');
                const next = String(form.get('next') || '');
                const confirm = String(form.get('confirm') || '');

                const err = validatePasswordWithPolicy(next);
                if (err) return fail(400, { error: err });
                if (next !== confirm) return fail(400, { error: 'Passwords do not match.' });

                const storedUser = findUserByEmail(locals.user.email);
                if (!storedUser) return fail(404, { error: 'User not found' });

                try {
                        await updatePassword(storedUser, current, next);
                        return { success: true };
                } catch (error: unknown) {
                        return fail(400, { error: error instanceof Error ? error.message : 'Unable to change password' });
                }
        }
};
