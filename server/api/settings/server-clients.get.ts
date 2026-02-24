import { getConnectedClients } from "~~/server/utils/broadcast-state";

export default defineEventHandler(() => {
	return getConnectedClients();
});
