<template>
	<div class="artist-card" @click="handleClick">
		<div class="artist-card-cover">
			<Cover
				:src="artist.cover"
				:width="coverSize"
				:height="coverSize"
			/>
		</div>

		<div class="artist-card-info">
			<div class="artist-card-name" :title="artist.name">
				{{ artist.name }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TArtist } from "~~/server/utils/types";

const props = defineProps<{
	artist: TArtist;
}>();

const emit = defineEmits<{
	click: [artist: TArtist];
}>();

const coverSize = computed(() => {
	if (typeof window === "undefined") {
		return 160;
	}
	const width = window.innerWidth;
	if (width <= 480) {
		return 80;
	}
	if (width <= 768) {
		return 100;
	}
	return 160;
});

const handleClick = () => {
	emit("click", props.artist);
	navigateTo(`/artist/${props.artist.id || props.artist.link}`);
};
</script>

<style scoped lang="scss">
.artist-card {
	cursor: pointer;
	transition: all 0.2s ease;
	padding: 0;

	&:hover {
		transform: translateY(-4px);

		.artist-card-cover {
			box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		}
	}

	&-cover {
		border-radius: 50%;
		overflow: hidden;
		margin-bottom: 12px;
		width: 100%;
		aspect-ratio: 1;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		transition: box-shadow 0.2s ease;

		@media (max-width: 480px) {
			margin-bottom: 8px;
		}

		:deep(img) {
			width: 100%;
			height: 100%;
			object-fit: cover;
			border-radius: 50%;
		}
	}

	&-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
		text-align: center;
	}

	&-name {
		font-weight: 600;
		font-size: 14px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;

		@media (max-width: 480px) {
			font-size: 12px;
		}
	}
}
</style>

