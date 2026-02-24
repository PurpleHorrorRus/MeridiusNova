import type { TAudio } from "../api/vk/audio/types";

export type BroadcastPeer = { send: (data: string) => void };

interface NowPlayingState {
	song: TAudio | null;
	paused: boolean;
	playlist: TAudio[];
	time: { currentTime: number; duration: number };
}

const state: NowPlayingState = {
	song: null,
	paused: false,
	playlist: [],
	time: { currentTime: 0, duration: 0 }
};

function broadcastSongState(): void {
	const payload = JSON.stringify({ song: state.song, paused: state.paused });
	songPeers.forEach((peer) => peer.send(payload));
}

const songPeers = new Set<BroadcastPeer>();
const playlistPeers = new Set<BroadcastPeer>();
const timePeers = new Set<BroadcastPeer>();

export type ConnectedClientEntry = { id: number; type: "song" | "playlist" | "time"; connectedAt: number; ip: string };

let connectionIdNext = 0;
const connectionMap = new Map<BroadcastPeer, ConnectedClientEntry>();

export function getConnectedClients(): ConnectedClientEntry[] {
	return Array.from(connectionMap.values());
}

export function getNowPlaying(): TAudio | null {
	return state.song;
}

export function getPaused(): boolean {
	return state.paused;
}

export function setNowPlaying(song: TAudio | null): void {
	state.song = song;
	broadcastSongState();
}

export function setPaused(paused: boolean): void {
	state.paused = paused;
	broadcastSongState();
}

export function getPlaylist(): TAudio[] {
	return state.playlist;
}

export function setPlaylist(playlist: TAudio[]): void {
	state.playlist = playlist;
	const payload = JSON.stringify(playlist);
	playlistPeers.forEach((peer) => {
		peer.send(payload);
	});
}

export function getTime(): { currentTime: number; duration: number } {
	return state.time;
}

export function setTime(currentTime: number, duration: number): void {
	state.time = { currentTime, duration };
	const payload = JSON.stringify({ time: currentTime, duration });
	timePeers.forEach((peer) => {
		peer.send(payload);
	});
}

function registerConnection(peer: BroadcastPeer, type: ConnectedClientEntry["type"], ip: string): void {
	connectionIdNext += 1;
	connectionMap.set(peer, { id: connectionIdNext, type, connectedAt: Date.now(), ip });
}

function unregisterConnection(peer: BroadcastPeer): void {
	connectionMap.delete(peer);
}

export function subscribeSong(peer: BroadcastPeer, ip: string): () => void {
	registerConnection(peer, "song", ip);
	songPeers.add(peer);
	return () => {
		songPeers.delete(peer);
		unregisterConnection(peer);
	};
}

export function subscribePlaylist(peer: BroadcastPeer, ip: string): () => void {
	registerConnection(peer, "playlist", ip);
	playlistPeers.add(peer);
	return () => {
		playlistPeers.delete(peer);
		unregisterConnection(peer);
	};
}

export function subscribeTime(peer: BroadcastPeer, ip: string): () => void {
	registerConnection(peer, "time", ip);
	timePeers.add(peer);
	return () => {
		timePeers.delete(peer);
		unregisterConnection(peer);
	};
}