<template>
	<div class="discover-update">
		<div class="update-header">
			<NuxtLink :to="link" class="update-user">
				<img :src="update.item.photo_max || '/no-cover.webp'" :alt="update.item.name" class="user-avatar" />
				<div class="user-info">
					<span class="user-name">{{ update.item.name }}</span>
					<span class="update-count">{{ countText }}</span>
				</div>
			</NuxtLink>
		</div>

		<div class="update-audios">
			<Song
				v-for="audio in update.audios"
				:key="audio.full_id"
				:audio="audio"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
type TUpdate = {
	item: {
		id: number;
		name: string;
		photo_max?: string;
	};
	audios: any[];
};

const props = defineProps<{
	update: TUpdate;
}>();

const link = computed(() => {
	return `/collection?owner_id=${props.update.item.id}`;
});

const countText = computed(() => {
	const count = props.update.audios.length;
	if (count === 1) {
		return "добавил 1 трек";
	}
	if (count >= 2 && count <= 4) {
		return `добавил ${count} трека`;
	}
	return `добавил ${count} треков`;
});
</script>

<style scoped lang="scss">
.discover-update {
	margin-bottom: 24px;
	padding: 16px;
	border-bottom: 1px solid var(--border, #2a2a2a);

	&:last-child {
		border-bottom: none;
	}
}

.update-header {
	margin-bottom: 12px;
}

.update-user {
	display: flex;
	align-items: center;
	gap: 12px;
	text-decoration: none;
	color: var(--text, #fff);
}

.user-avatar {
	width: 50px;
	height: 50px;
	border-radius: 50%;
	object-fit: cover;
}

.user-info {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.user-name {
	font-weight: 600;
	font-size: 14px;

	&:hover {
		color: var(--secondary, #e9003f);
	}
}

.update-count {
	font-size: 12px;
	color: var(--text-secondary, #b3b3b3);
}

.update-audios {
	margin-left: 62px;
}
</style>

