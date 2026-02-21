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

export function subscribeSong(peer: BroadcastPeer): () => void {
	songPeers.add(peer);
	return () => songPeers.delete(peer);
}

export function subscribePlaylist(peer: BroadcastPeer): () => void {
	playlistPeers.add(peer);
	return () => playlistPeers.delete(peer);
}

export function subscribeTime(peer: BroadcastPeer): () => void {
	timePeers.add(peer);
	return () => timePeers.delete(peer);
}