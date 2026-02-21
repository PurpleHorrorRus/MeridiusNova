import { getNowPlaying, getPaused, subscribeSong } from "~~/server/utils/broadcast-state";
import { verifyWebSocketPassword } from "~~/server/utils/websocket-auth";

const unsubMap = new WeakMap<{ send: (data: string) => void }, () => void>();

export default defineWebSocketHandler({
	async open(peer) {
		if (!(await verifyWebSocketPassword(peer as any))) {
			peer.close(4001);
			return;
		}

		const peerRef = { send: (data: string) => peer.send(data) };
		const unsub = subscribeSong(peerRef);
		unsubMap.set(peerRef, unsub);

		(peer as any).__unsubRef = peerRef;

		peer.send(JSON.stringify({ song: getNowPlaying(), paused: getPaused() }));
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