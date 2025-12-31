import type { TArtist } from "~~/server/utils/types";

export const useArtistsStore = defineStore("artists", {
	state: () => ({
		current: null as {
			name: string;
			cover: {
				src: string;
				blur: boolean;
			};
			artists: TArtist[];
			collections: any[];
			follow: {
				followed: boolean;
				id: string;
				type: string;
				hash: string;
			};
			audios?: any[];
		} | null,
		loading: false,
		error: null as string | null
	}),

	actions: {
		async loadArtist(artist: string, withList = false) {
			this.loading = true;
			this.error = null;

		const data = await $fetch(`/api/vk/artists/${artist}`, {
			params: {
				list: withList
			}
		}).catch((error: Error) => {
				this.error = error.message || "Failed to load artist";
				return null;
			});

			if (data) {
				this.current = data;
			} else {
				this.current = null;
			}

			this.loading = false;
		},

		clear() {
			this.current = null;
			this.error = null;
		}
	}
});

