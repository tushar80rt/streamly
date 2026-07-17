const products = [
	{ id: 1, name: 'Starter Plan', price: 9, category: 'subscription' },
	{ id: 2, name: 'Pro Plan', price: 29, category: 'subscription' },
	{ id: 3, name: 'Team Plan', price: 79, category: 'subscription' }
];

let nextId = 4;

export function listProducts() {
	return products;
}

export function getProduct(id) {
	return products.find((product) => product.id === id);
}

export function createProduct(product) {
	const newProduct = { id: nextId++, ...product };
	products.push(newProduct);
	return newProduct;
}

export function updateProduct(id, changes) {
	const product = getProduct(id);
	if (!product) return undefined;

	Object.assign(product, changes, { id });
	return product;
}

export function deleteProduct(id) {
	const index = products.findIndex((product) => product.id === id);
	if (index === -1) return false;

	products.splice(index, 1);
	return true;
}
