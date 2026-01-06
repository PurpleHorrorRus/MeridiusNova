import { inject, provide, shallowRef, computed, type Ref, type ComputedRef, type ShallowRef } from "vue";
import type { TAudio } from "~~/server/api/vk/audio/types";

const SongsContextKey = Symbol("songs-context");

export const provideSongsContext = (songs: TAudio[] | Ref<TAudio[]> | ComputedRef<TAudio[]> | ShallowRef<TAudio[]>) => {
	// Если передан массив, создаем shallowRef для экономии памяти, иначе используем переданный ref/computed
	const songsRef = Array.isArray(songs) ? shallowRef(songs) : songs;
	
	provide(SongsContextKey, songsRef);
};

export const useSongsContext = (): Ref<TAudio[]> | ComputedRef<TAudio[]> | ShallowRef<TAudio[]> | undefined => {
	return inject<Ref<TAudio[]> | ComputedRef<TAudio[]> | ShallowRef<TAudio[]> | undefined>(SongsContextKey, undefined);
};

