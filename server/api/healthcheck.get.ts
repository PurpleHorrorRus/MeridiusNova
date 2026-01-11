export default defineEventHandler(async (event) => {
	setHeader(event, "Access-Control-Allow-Origin", "*");
	setHeader(event, "Access-Control-Allow-Methods", "GET, OPTIONS");
	setHeader(event, "Access-Control-Allow-Headers", "Content-Type, Accept");

	return {
		status: "ok",
		version: "1.0.0"
	};
});