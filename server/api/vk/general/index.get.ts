import { getGeneralRequestsInstance } from "./general";

export default defineEventHandler(async (event) => {
	const generalRequests = getGeneralRequestsInstance(event);
	
	// Отключаем кэширование браузера
	setHeader(event, "Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
	setHeader(event, "Pragma", "no-cache");
	setHeader(event, "Expires", "0");
	
	return await generalRequests.load();
});

