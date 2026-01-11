export default defineEventHandler(async (event) => {
	setHeader(event, "Access-Control-Allow-Origin", "*");
	setHeader(event, "Access-Control-Allow-Methods", "GET, OPTIONS");
	setHeader(event, "Access-Control-Allow-Headers", "Content-Type, Accept");
	setHeader(event, "Access-Control-Max-Age", "86400");

	return null;
});

