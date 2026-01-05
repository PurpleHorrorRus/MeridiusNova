import { inject, provide, ref, computed, watch, type Ref, type ComputedRef } from "vue";
import type { TAudio } from "~~/server/api/vk/audio/types";

const SongsContextKey = Symbol("songs-context");

export const provideSongsContext = (songs: TAudio[] | Ref<TAudio[]> | ComputedRef<TAudio[]>) => {
	// Если передан массив, создаем ref, иначе используем переданный ref/computed
	const songsRef = Array.isArray(songs) ? ref(songs) : songs;
	
	provide(SongsContextKey, songsRef);
};

export const useSongsContext = (): Ref<TAudio[]> | ComputedRef<TAudio[]> | undefined => {
	return inject<Ref<TAudio[]> | ComputedRef<TAudio[]> | undefined>(SongsContextKey, undefined);
};

