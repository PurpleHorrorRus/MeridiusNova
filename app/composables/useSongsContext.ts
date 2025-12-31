import { inject, provide, type Ref } from "vue";
import type { TAudio } from "~~/server/api/vk/audio/types";

const SongsContextKey = Symbol("songs-context");

export const provideSongsContext = (songs: Ref<TAudio[]>) => {
	provide(SongsContextKey, songs);
};

export const useSongsContext = (): Ref<TAudio[]> | undefined => {
	return inject<Ref<TAudio[]>>(SongsContextKey);
};

