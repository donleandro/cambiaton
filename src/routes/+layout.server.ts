import type { LayoutServerLoad } from './$types';
import { authEnabled } from '$lib/server/auth';

export const load: LayoutServerLoad = ({ locals }) => {
	return {
		authEnabled: authEnabled(),
		authenticated: locals.authenticated
	};
};
