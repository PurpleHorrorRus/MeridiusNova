<template>
	<Transition name="queue-slide" :duration="150">
		<div v-if="showQueue && songsCount > 0" class="fullscreen-queue-section fullscreen-queue">
			<QueueContent
				:auto-scroll="true"
				@close="$emit('toggleQueue')"
			/>
		</div>
	</Transition>
</template>

<script setup lang="ts">
import QueueContent from "~/components/QueueContent.vue";

defineProps<{
	showQueue: boolean;
	songsCount: number;
}>();

defineEmits<{
	toggleQueue: [];
}>();
</script>

<style scoped lang="scss">
.fullscreen-queue-section {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	height: 60%;
	max-height: 600px;
	background: rgba(0, 0, 0, 0.85);
	border-top: 1px solid rgba(255, 255, 255, 0.1);

	display: flex;
	flex-direction: column;
	overflow: hidden;
	z-index: 10001;
	padding-bottom: env(safe-area-inset-bottom, 0);

	@media (max-width: 768px) {
		height: 70%;
		max-height: none;
	}

	@media (max-width: 480px) {
		height: 75%;
	}

	:deep(.queue-content-header) {
		padding: 20px 24px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);

		@media (max-width: 768px) {
			padding: 16px 20px;
		}

		@media (max-width: 480px) {
			padding: 12px 16px;
		}
	}

	:deep(.queue-content-title) {
		font-size: 20px;

		@media (max-width: 768px) {
			font-size: 18px;
		}

		@media (max-width: 480px) {
			font-size: 16px;
		}
	}

	:deep(.queue-content-close) {
		color: rgba(255, 255, 255, 0.7);

		&:hover {
			background: rgba(255, 255, 255, 0.1);
			color: #fff;
		}
	}

	:deep(.queue-content-empty) {
		color: rgba(255, 255, 255, 0.5);
	}

	:deep(.queue-content-current-playlist) {
		padding: 16px 24px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.05);

		@media (max-width: 768px) {
			padding: 12px 20px;
			gap: 12px;
		}

		@media (max-width: 480px) {
			padding: 10px 16px;
			gap: 10px;
		}

		&.queue-content-current-playlist-clickable:hover {
			background: rgba(255, 255, 255, 0.1);
		}
	}

	:deep(.queue-content-current-cover) {
		width: 64px;
		height: 64px;
		border-radius: 10px;

		@media (max-width: 480px) {
			width: 56px;
			height: 56px;
			border-radius: 8px;
		}
	}

	:deep(.queue-content-current-title) {
		font-size: 14px;

		@media (max-width: 480px) {
			font-size: 13px;
		}
	}

	:deep(.queue-content-current-description) {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.6);

		@media (max-width: 480px) {
			font-size: 11px;
		}
	}

	:deep(.queue-content-current-meta) {
		gap: 6px;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.5);

		@media (max-width: 480px) {
			font-size: 10px;
			gap: 4px;
		}
	}

	:deep(.queue-content-current-author) {
		color: rgba(255, 255, 255, 0.8);
	}

	:deep(.queue-content-tracks) {
		padding: 0;

		&::-webkit-scrollbar {
			width: 6px;
		}

		&::-webkit-scrollbar-track {
			background: rgba(255, 255, 255, 0.05);
			border-radius: 3px;
		}

		&::-webkit-scrollbar-thumb {
			background: rgba(255, 255, 255, 0.2);
			border-radius: 3px;

			&:hover {
				background: rgba(255, 255, 255, 0.3);
			}
		}

		:deep(.song) {
			background: transparent;
			padding: 10px 24px;
			border-radius: 0;
			margin: 0;
			min-height: 56px;

			@media (max-width: 768px) {
				padding: 8px 20px;
				min-height: 52px;
			}

			@media (max-width: 480px) {
				padding: 6px 16px;
				min-height: 48px;
			}

			&:hover {
				background: rgba(255, 255, 255, 0.05);
			}

			&.playing {
				background: var(--active, rgba(233, 0, 63, 0.1));
			}

			.song-cover {
				width: 50px;
				height: 50px;

				@media (max-width: 768px) {
					width: 45px;
					height: 45px;
				}

				@media (max-width: 480px) {
					width: 40px;
					height: 40px;
				}
			}

			.song-info-title {
				font-size: 14px;

				@media (max-width: 768px) {
					font-size: 13px;
				}

				@media (max-width: 480px) {
					font-size: 12px;
				}
			}

			.song-info-artist {
				font-size: 13px;

				@media (max-width: 768px) {
					font-size: 12px;
				}

				@media (max-width: 480px) {
					font-size: 11px;
				}
			}

			.song-duration {
				font-size: 13px;

				@media (max-width: 768px) {
					font-size: 12px;
				}

				@media (max-width: 480px) {
					font-size: 11px;
				}
			}
		}
	}
}


.queue-slide-enter-active {
	transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.queue-slide-leave-active {
	transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.queue-slide-enter-from {
	transform: translateY(100%);
}

.queue-slide-enter-to {
	transform: translateY(0);
}

.queue-slide-leave-from {
	transform: translateY(0);
}

.queue-slide-leave-to {
	transform: translateY(100%);
}
</style>

