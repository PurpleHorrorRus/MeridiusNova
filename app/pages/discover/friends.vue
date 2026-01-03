<template>
	<div class="page" id="friends-page">
		<DiscoverNav />
		
		<div v-if="pending || !data" class="content">
			<div class="skeleton-title"></div>
			<div class="friends-list">
				<div v-for="i in 8" :key="i" class="friend-item skeleton-friend">
					<div class="friend-avatar-wrapper skeleton-avatar"></div>
					<div class="friend-info">
						<div class="skeleton-name"></div>
					</div>
				</div>
			</div>
		</div>

		<div v-else-if="error && !data" class="error">
			{{ error }}
		</div>

		<div v-else class="content">
			<h1>Друзья</h1>
			<div v-if="friends.length === 0" class="empty-state">
				<p>Друзья не найдены</p>
			</div>
			<div v-else class="friends-list">
				<div v-for="friend in friends" :key="friend.id" class="friend-item" @click="handleFriendClick(friend.id)">
					<div class="friend-avatar-wrapper">
						<img v-if="friend.photo_100" :src="friend.photo_100" :alt="getFriendName(friend)" class="friend-avatar" />
						<div v-else class="friend-avatar-placeholder">
							{{ getFriendInitials(friend) }}
						</div>
					</div>
					<div class="friend-info">
						<span class="friend-name">{{ getFriendName(friend) }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
const { data, pending, error } = useLazyFetch<Array<{
	id: number;
	first_name: string;
	last_name: string;
	photo_100?: string;
}>>("/api/vk/friends", {
	server: false
});

const friends = computed(() => {
	return data.value || [];
});

const getFriendName = (friend: { first_name: string; last_name: string }): string => {
	return `${friend.first_name} ${friend.last_name}`;
};

const getFriendInitials = (friend: { first_name: string; last_name: string }): string => {
	return `${friend.first_name.charAt(0)}${friend.last_name.charAt(0)}`.toUpperCase();
};

const handleFriendClick = (friendId: number) => {
	navigateTo(`/playlist/${friendId}/-1`);
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
	width: 150px;
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

.skeleton-friend {
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
	width: 100px;
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

.friends-list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 20px;
}

.friend-item {
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

.friend-avatar-wrapper {
	position: relative;
	width: 100px;
	height: 100px;
	border-radius: 50%;
	overflow: hidden;
	flex-shrink: 0;
}

.friend-avatar {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.friend-avatar-placeholder {
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

.friend-info {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	text-align: center;
}

.friend-name {
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

