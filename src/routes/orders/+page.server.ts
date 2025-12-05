import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { addOrder, deleteOrder, listOrdersForUser, logEvent, updateOrder } from '$lib/server/store';
import { validateOrderInput } from '$lib/validation';

export const load: PageServerLoad = async ({ locals }) => {
        if (!locals.user) throw fail(401, { error: 'Unauthorized' });
        const orders = listOrdersForUser({ ...locals.user });
        return { orders, user: locals.user };
};

export const actions: Actions = {
        create: async ({ request, locals }) => {
                if (!locals.user) return fail(401, { error: 'Unauthorized' });
                const form = await request.formData();
                const description = String(form.get('description') || '').trim();
                const quantity = Number(form.get('quantity'));
                const err = validateOrderInput(description, quantity);
                if (err) {
                        logEvent({ action: 'validation.order', outcome: 'FAILURE', userId: locals.user.id, detail: err });
                        return fail(400, { error: err });
                }
                addOrder(locals.user, { description, quantity });
                return { success: true };
        },
        update: async ({ request, locals }) => {
                if (!locals.user) return fail(401, { error: 'Unauthorized' });
                const form = await request.formData();
                const id = String(form.get('id') || '');
                const description = String(form.get('description') || '').trim();
                const quantity = Number(form.get('quantity'));
                const status = String(form.get('status') || 'PENDING') as 'PENDING' | 'APPROVED' | 'CANCELLED';
                const err = validateOrderInput(description, quantity);
                if (err) {
                        logEvent({ action: 'validation.order', outcome: 'FAILURE', userId: locals.user.id, detail: err });
                        return fail(400, { error: err });
                }
                const updated = updateOrder(locals.user, id, { description, quantity, status });
                if (!updated) {
                        logEvent({ action: 'access.order.update', outcome: 'FAILURE', userId: locals.user.id, detail: id });
                        return fail(403, { error: 'Not allowed to update this order' });
                }
                return { success: true };
        },
        delete: async ({ request, locals }) => {
                if (!locals.user) return fail(401, { error: 'Unauthorized' });
                const form = await request.formData();
                const id = String(form.get('id') || '');
                const ok = deleteOrder(locals.user, id);
                if (!ok) {
                        logEvent({ action: 'access.order.delete', outcome: 'FAILURE', userId: locals.user.id, detail: id });
                        return fail(403, { error: 'Not allowed to delete this order' });
                }
                return { success: true };
        }
};
