<template>
	<div class="music-tab">
		<div v-if="pending && !data" class="loading">
			<LoadingSpinner />
		</div>

		<div v-else-if="error && !data" class="error">
			{{ error }}
		</div>

		<div v-else class="music-content">
			<div class="playlist-tracks">
				<div class="playlist-tracks-header">
					<span class="tracks-header-title">Название</span>
					<span class="tracks-header-album">Альбом</span>
					<span class="tracks-header-duration">
						<Icon name="mdi:clock-outline" size="16" />
					</span>
				</div>

				<Song
					v-for="(audio, index) in audios"
					:key="`${audio.owner_id}-${audio.id}-${index}`"
					:audio="audio"
					:index="index"
				/>

				<div v-show="hasMore" class="load-more" ref="loadMoreRef">
					<LoadingSpinner v-if="isLoadingMore" />
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useVkStore } from "~/stores/vk";
import type { TParsedPayload } from "~~/server/api/vk/audio/types";
import { provideSongsContext } from "~/composables/useSongsContext";

const route = useRoute();
const vkStore = useVkStore();

const ownerId = computed(() => {
	const ownerIdParam = route.query.owner_id as string;
	return ownerIdParam ? Number(ownerIdParam) : vkStore.user_id || 0;
});

const { data, pending, error } = useFetch<TParsedPayload>(
	() => `/api/vk/audio/${ownerId.value}/-1`,
	{
		immediate: true,
		cache: "no-store"
	}
);

const audios = computed(() => {
	if (data.value && data.value.audios) {
		return data.value.audios;
	}
	return [];
});

provideSongsContext(audios);

const hasMore = computed(() => {
	if (!data.value || !data.value.more) {
		return false;
	}
	const more = data.value.more;
	return Boolean(more.section_id && more.next_from);
});

const loadMoreRef = ref<HTMLElement | null>(null);
const isLoadingMore = ref(false);

const loadMore = async () => {
	if (!hasMore.value || pending.value || isLoadingMore.value || !data.value || !data.value.more) {
		return;
	}

	const more = data.value.more;
	if (!more.section_id || !more.next_from) {
		return;
	}

	isLoadingMore.value = true;

	const result = await $fetch<TParsedPayload>(`/api/vk/audio/${ownerId.value}/-1`, {
		params: {
			section_id: more.section_id,
			next_from: more.next_from
		}
	}).catch((error) => {
		console.error("Failed to load more:", error);
		return null;
	});

	if (result && data.value) {
		if (result.audios && result.audios.length > 0) {
			data.value.audios.push(...result.audios);
		}

		if (result.more) {
			data.value.more = result.more;
		} else {
			data.value.more = {
				section_id: "",
				next_from: "",
				start_from: ""
			};
		}
	}

	isLoadingMore.value = false;
};

useScrollLoad(() => {
	if (!hasMore.value) {
		return;
	}

	if (isLoadingMore.value) {
		return;
	}

	loadMore();
}, {
	threshold: 200,
	enabled: computed(() => {
		return !isLoadingMore.value;
	})
});
</script>

<style scoped lang="scss">
.music-tab {
	display: flex;
	flex-direction: column;
	min-height: 100%;
}

.loading,
.error {
	text-align: center;
	padding: 40px;
}

.music-content {
	display: flex;
	flex-direction: column;
}

.playlist-tracks {
	display: flex;
	flex-direction: column;
	padding: 0 32px 32px;
}

.playlist-tracks-header {
	display: grid;
	grid-template-columns: 1fr 1fr 80px;
	gap: 16px;
	padding: 8px 16px;
	border-bottom: 1px solid var(--border, #282828);
	color: var(--text-secondary, #b3b3b3);
	font-size: 12px;
	font-weight: 500;
	text-transform: uppercase;
	letter-spacing: 1px;
	position: sticky;
	top: 0;
	background: var(--bg-primary, #121212);
	z-index: 10;
	align-items: center;
}

.tracks-header-title {
	grid-column: 1;
}

.tracks-header-album {
	grid-column: 2;
}

.tracks-header-duration {
	grid-column: 3;
	text-align: center;
	display: flex;
	align-items: center;
	justify-content: center;
}

.load-more {
	text-align: center;
	padding: 20px;
	color: var(--text-secondary, #b3b3b3);
}
</style>

