import { getPlaylist, subscribePlaylist } from "~~/server/utils/broadcast-state";
import { getClientIp, verifyWebSocketPassword } from "~~/server/utils/websocket-auth";

const unsubMap = new WeakMap<{ send: (data: string) => void }, () => void>();

export default defineWebSocketHandler({
	async open(peer) {
		const ok = await verifyWebSocketPassword(peer as any);
		if (!ok) {
			peer.close(4001);
			return;
		}
		const peerRef = { send: (data: string) => peer.send(data) };
		const unsub = subscribePlaylist(peerRef, getClientIp(peer as any));
		unsubMap.set(peerRef, unsub);
		(peer as any).__unsubRef = peerRef;
		const playlist = getPlaylist();
		if (playlist.length > 0) {
			peer.send(JSON.stringify(playlist));
		}
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
