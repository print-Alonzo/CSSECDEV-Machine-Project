import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listLogs } from '$lib/server/store';

export const load: PageServerLoad = async ({ locals }) => {
        if (!locals.user || locals.user.role !== 'ADMIN') {
                throw error(403, 'Forbidden');
        }
        return { logs: listLogs() };
};
