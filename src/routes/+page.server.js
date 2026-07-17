export async function load({ locals }) {
	const { data: claimsData, error } = await locals.supabase.auth.getClaims();
	const { data } = await locals.supabase.from('countries').select();

	return {
		countries: data ?? [],
		claims: error ? null : claimsData?.claims ?? null
	};
}
