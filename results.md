# API Test Results

Tested locally on `2026-07-16` against `http://127.0.0.1:5173` using the SvelteKit development server.

| # | Request | Expected | Actual | Result | Response summary |
| --- | --- | --- | --- | --- | --- |
| 1 | `GET /apis/status` | `200` | `200` | Pass | `{"name":"hello"}` |
| 2 | `POST /apis/status` | `200` | `200` | Pass | `{"name":"Tushar"}` |
| 3 | `GET /apis/health` | `200` | `200` | Pass | `{"status":"ok","service":"landing-page-api"}` |
| 4 | `GET /apis/products` | `200` | `200` | Pass | Three seeded subscription products returned. |
| 5 | `POST /apis/products` with a valid product | `201` | `201` | Pass | Created product `id: 4`, named `API Test Plan`. |
| 6 | `GET /apis/products/4` | `200` | `200` | Pass | Returned the newly created product. |
| 7 | `PATCH /apis/products/4` with `{"price":20}` | `200` | `200` | Pass | Price updated to `20`. |
| 8 | `DELETE /apis/products/4` | `204` | `204` | Pass | Product deleted; response body was empty. |
| 9 | `GET /apis/products/4` after deletion | `404` | `404` | Pass | Error message: `Product not found`. |
| 10 | `POST /apis/products` with an empty name and negative price | `400` | `400` | Pass | Error message: `name must be a non-empty string`. |

## Notes

- **Result:** 10/10 requests passed.
- Product data is stored only in the running server's memory. The test product was deleted before the test run ended.
- Error responses are returned as SvelteKit's default HTML error page when the request does not explicitly ask for JSON. The status codes and error messages were correct.
