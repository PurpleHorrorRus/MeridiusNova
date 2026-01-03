export default defineEventHandler(async (event) => {
	const url = event.node.req.url || "";
	
	if (url.startsWith("/api/cache/")) {
		console.log(`[CacheLogger] ===== Request to ${url} =====`);
		console.log(`[CacheLogger] Method: ${event.node.req.method}`);
		console.log(`[CacheLogger] Headers:`, JSON.stringify(event.node.req.headers, null, 2));
	}
});

