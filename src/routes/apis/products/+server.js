import { error, json } from '@sveltejs/kit';
import { createProduct, listProducts } from '$lib/server/products';

function validateProduct(body) {
	if (!body || typeof body.name !== 'string' || body.name.trim().length === 0) {
		return 'name must be a non-empty string';
	}

	if (typeof body.price !== 'number' || body.price < 0) {
		return 'price must be a non-negative number';
	}

	if (typeof body.category !== 'string' || body.category.trim().length === 0) {
		return 'category must be a non-empty string';
	}
}

export function GET({ url }) {
	const category = url.searchParams.get('category');
	const products = category
		? listProducts().filter((product) => product.category === category)
		: listProducts();

	return json({ products, count: products.length });
}

export async function POST({ request }) {
	let body;
	try {
		body = await request.json();
	} catch {
		error(400, 'Request body must be valid JSON');
	}

	const validationError = validateProduct(body);
	if (validationError) error(400, validationError);

	const product = createProduct({
		name: body.name.trim(),
		price: body.price,
		category: body.category.trim()
	});

	return json({ product }, { status: 201 });
}
