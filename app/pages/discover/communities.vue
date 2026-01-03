<template>
	<div class="page" id="communities-page">
		<DiscoverNav />
		
		<div v-if="pending || !data" class="content">
			<div class="skeleton-title"></div>
			<div class="communities-list">
				<div v-for="i in 8" :key="i" class="community-item skeleton-community">
					<div class="community-avatar-wrapper skeleton-avatar"></div>
					<div class="community-info">
						<div class="skeleton-name"></div>
					</div>
				</div>
			</div>
		</div>

		<div v-else-if="error && !data" class="error">
			{{ error }}
		</div>

		<div v-else class="content">
			<h1>Сообщества</h1>
			<div v-if="communities.length === 0" class="empty-state">
				<p>Сообщества не найдены</p>
			</div>
			<div v-else class="communities-list">
				<div v-for="community in communities" :key="community.id" class="community-item" @click="handleCommunityClick(community.id)">
					<div class="community-avatar-wrapper">
						<img v-if="community.photo_100" :src="community.photo_100" :alt="community.name" class="community-avatar" />
						<div v-else class="community-avatar-placeholder">
							{{ getCommunityInitials(community.name) }}
						</div>
					</div>
					<div class="community-info">
						<span class="community-name">{{ community.name }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
const { data, pending, error } = useLazyFetch<Array<{
	id: number;
	name: string;
	photo_100?: string;
}>>("/api/vk/groups", {
	server: false
});

const communities = computed(() => {
	return data.value || [];
});

const getCommunityInitials = (name: string): string => {
	const words = name.trim().split(/\s+/);
	if (words.length >= 2) {
		return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
	}
	return name.charAt(0).toUpperCase();
};

const handleCommunityClick = (communityId: number) => {
	navigateTo(`/playlist/${communityId}/-1`);
};
</script>

<style scoped lang="scss">
.page {
	padding: 20px;
}

.error {
	text-align: center;
	padding: 40px;
}

.skeleton-title {
	height: 32px;
	width: 200px;
	border-radius: 4px;
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0.05) 0%,
		rgba(255, 255, 255, 0.1) 50%,
		rgba(255, 255, 255, 0.05) 100%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
	margin-bottom: 20px;
}

.skeleton-community {
	pointer-events: none;
}

.skeleton-avatar {
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0.05) 0%,
		rgba(255, 255, 255, 0.1) 50%,
		rgba(255, 255, 255, 0.05) 100%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
}

.skeleton-name {
	height: 16px;
	width: 120px;
	border-radius: 4px;
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0.05) 0%,
		rgba(255, 255, 255, 0.1) 50%,
		rgba(255, 255, 255, 0.05) 100%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
	0% {
		background-position: -200% 0;
	}
	100% {
		background-position: 200% 0;
	}
}

.content {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

h1 {
	font-size: 32px;
	font-weight: 700;
}

.communities-list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 20px;
}

.community-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	padding: 16px;
	border: 1px solid var(--border, #2a2a2a);
	border-radius: 12px;
	cursor: pointer;
	transition: all 0.2s;
	background: var(--bg-secondary, #181818);

	&:hover {
		background: var(--bg-hover, #2a2a2a);
		border-color: var(--border-secondary, #3a3a3a);
	}
}

.community-avatar-wrapper {
	position: relative;
	width: 100px;
	height: 100px;
	border-radius: 50%;
	overflow: hidden;
	flex-shrink: 0;
}

.community-avatar {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.community-avatar-placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--secondary, #e9003f);
	color: var(--text, #fff);
	font-weight: 600;
	font-size: 32px;
}

.community-info {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	text-align: center;
}

.community-name {
	font-weight: 600;
	font-size: 14px;
	color: var(--text, #fff);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 100%;
}

.empty-state {
	text-align: center;
	padding: 40px;
	color: var(--text-secondary, #b3b3b3);
}
</style>

