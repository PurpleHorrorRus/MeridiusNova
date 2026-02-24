import { getTime, subscribeTime } from "~~/server/utils/broadcast-state";
import { verifyWebSocketPassword, getClientIp } from "~~/server/utils/websocket-auth";

const unsubMap = new WeakMap<{ send: (data: string) => void }, () => void>();

export default defineWebSocketHandler({
	async open(peer) {
		const ok = await verifyWebSocketPassword(peer as any);
		if (!ok) {
			peer.close(4001);
			return;
		}
		const peerRef = { send: (data: string) => peer.send(data) };
		const unsub = subscribeTime(peerRef, getClientIp(peer as any));
		unsubMap.set(peerRef, unsub);
		(peer as any).__unsubRef = peerRef;
		const time = getTime();
		peer.send(JSON.stringify({ time: time.currentTime, duration: time.duration }));
	},
	close(peer) {
		const ref = (peer as any).__unsubRef;
		if (ref) {
			const unsub = unsubMap.get(ref);
			if (typeof unsub === "function") {
				unsub();
			}
			unsubMap.delete(ref);
		}
	}
});
