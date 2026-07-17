import { error, json } from '@sveltejs/kit';
import { deleteProduct, getProduct, updateProduct } from '$lib/server/products';

function parseId(value) {
	const id = Number(value);
	if (!Number.isInteger(id) || id < 1) error(400, 'id must be a positive integer');
	return id;
}
function readProductChanges(body) {
	if (!body || typeof body !== 'object') error(400, 'Request body must be a JSON object');

	const changes = {};
	if ('name' in body) {
		if (typeof body.name !== 'string' || body.name.trim().length === 0) {
			error(400, 'name must be a non-empty string');
		}
		changes.name = body.name.trim();
	}
	if ('price' in body) {
		if (typeof body.price !== 'number' || body.price < 0) {
			error(400, 'price must be a non-negative number');
		}
		changes.price = body.price;
	}
	if ('category' in body) {
		if (typeof body.category !== 'string' || body.category.trim().length === 0) {
			error(400, 'category must be a non-empty string');
		}
		changes.category = body.category.trim();
	}

	if (Object.keys(changes).length === 0) error(400, 'Provide at least one product field to update');
	return changes;
}

export function GET({ params }) {
	const product = getProduct(parseId(params.id));
	if (!product) error(404, 'Product not found');
	return json({ product });
}

export async function PATCH({ params, request }) {
	const id = parseId(params.id);
	let body;
	try {
		body = await request.json();
	} catch {
		error(400, 'Request body must be valid JSON');
	}

	const product = updateProduct(id, readProductChanges(body));
	if (!product) error(404, 'Product not found');
	return json({ product });
}

export function DELETE({ params }) {
	const id = parseId(params.id);
	if (!deleteProduct(id)) error(404, 'Product not found');
	return new Response(null, { status: 204 });
}
