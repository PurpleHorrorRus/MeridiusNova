<template>
	<div class="download-item">
		<div class="download-item-header">
			<Cover
				v-if="coverUrl"
				:src="coverUrl"
				:width="coverSize"
				:height="coverSize"
				:class="['download-item-cover', `download-item-cover-${download.type}`]"
			/>

			<div class="download-item-info">
				<div class="download-item-main">
					<div class="download-item-title-row">
						<span class="download-item-title" :title="title">{{ title }}</span>
						<div class="download-item-icons">
							<Icon :name="statusIcon" :size="14" :class="['download-item-status-icon', `status-${status}`]" />
							<button
								v-if="status === 'completed' && isTauri()"
								class="download-item-explorer-button"
								@click.stop="openInExplorer"
								:title="getString('downloads.openInExplorer')"
							>
								<Icon name="mdi:folder-open" size="12" class="download-item-explorer-icon" />
							</button>
						</div>
					</div>

					<div v-if="download.type === 'audio'" class="download-item-subtitle">
						<span class="download-item-artist">{{ artist }}</span>
					</div>

					<div v-else-if="download.type === 'playlist'" class="download-item-subtitle">
						<span v-if="playlistAuthor" class="download-item-author">{{ playlistAuthor }}</span>
						<span v-if="download.type === 'playlist' && download.total" class="download-item-count">
							{{ download.downloaded || 0 }} / {{ download.total }}
						</span>
					</div>
				</div>

				<div v-if="showProgress" class="download-item-progress">
					<DownloadProgress :percent="percent" />
				</div>
			</div>
		</div>

		<div v-if="status === 'failed' && download.error" class="download-item-error">
			<Icon name="mdi:alert-circle" size="12" />
			<span>{{ download.error }}</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TDownload } from "~~/server/utils/download-manager";
import DownloadProgress from "./DownloadProgress.vue";
import Cover from "../Cover.vue";

const props = defineProps<{
	download: TDownload;
}>();

import { isTauri } from "~/utils/tauri";

const { getString } = useStrings();
const config = useRuntimeConfig();
const isExternalServer = computed(() => config.public.externalServer === true);

const status = computed(() => props.download.status);
const percent = computed(() => props.download.percent);

const title = computed(() => {
	if (props.download.type === "audio") {
		return props.download.audio.title;
	} else if (props.download.type === "playlist") {
		return props.download.playlist.title;
	} else if (props.download.type === "ffmpeg") {
		return "FFmpeg";
	}
	return "";
});

const artist = computed(() => {
	if (props.download.type === "audio") {
		return props.download.audio.performer || props.download.audio.artist || "";
	}
	return "";
});

const playlistAuthor = computed(() => {
	if (props.download.type === "playlist") {
		return props.download.playlist.author?.name || "";
	}
	return "";
});

const coverUrl = computed(() => {
	if (props.download.type === "audio") {
		return props.download.audio.coverUrl_p || props.download.audio.coverUrl_s;
	} else if (props.download.type === "playlist") {
		return props.download.playlist.cover_url;
	}
	return null;
});

const coverSize = 32;

const showProgress = computed(() => {
	return status.value !== "queued" && status.value !== "completed" && status.value !== "failed";
});

const statusIcon = computed(() => {
	if (status.value === "queued") {
		return "mdi:clock-outline";
	} else if (status.value === "preparing") {
		return "mdi:loading";
	} else if (status.value === "downloading") {
		return "mdi:download";
	} else if (status.value === "processing") {
		return "mdi:cog";
	} else if (status.value === "completed") {
		return "mdi:check-circle";
	} else if (status.value === "failed") {
		return "mdi:alert-circle";
	}
	return "mdi:help-circle";
});

const openInExplorer = async () => {
	if (!isTauri() || status.value !== "completed") {
		return;
	}

	const response = await $fetch<{ path: string; type: "file" | "folder"; requiresDownload?: boolean }>(`/api/downloads/path?downloadId=${props.download.downloadId}`).catch(() => null);

	if (!response) {
		return;
	}

	if (response.requiresDownload && props.download.type === "audio") {
		const fileResponse = await fetch(`/api/downloads/file?downloadId=${props.download.downloadId}`).catch(() => null);

		if (!fileResponse || !fileResponse.ok) {
			return;
		}

		const blob = await fileResponse.blob().catch(() => null);

		if (!blob) {
			return;
		}

		const contentDisposition = fileResponse.headers.get("Content-Disposition");
		let filename = props.download.audio.title || "audio";

		if (contentDisposition) {
			const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
			if (filenameMatch && filenameMatch[1]) {
				filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ""));
			}
		}

		if (!filename.endsWith(".mp3")) {
			filename = `${filename}.mp3`;
		}

		const { downloadDir } = await import("@tauri-apps/api/path");
		const { writeBinaryFile } = await import("@tauri-apps/plugin-fs");
		const { join } = await import("@tauri-apps/api/path");

		const downloadPath = await downloadDir();
		const filePath = await join(downloadPath, filename);
		const arrayBuffer = await blob.arrayBuffer();
		const uint8Array = new Uint8Array(arrayBuffer);

		await writeBinaryFile(filePath, uint8Array);

		const { Command } = await import("@tauri-apps/plugin-shell");
		const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
		const isWindows = process.platform === "win32";

		if (isWindows) {
			await Command.create("explorer", ["/select,", filePath]).execute();
		} else {
			await revealItemInDir(filePath);
		}

		return;
	}

	const { Command } = await import("@tauri-apps/plugin-shell");
	const { revealItemInDir, openPath } = await import("@tauri-apps/plugin-opener");

	if (response.type === "file") {
		const isWindows = process.platform === "win32";

		if (isWindows) {
			await Command.create("explorer", ["/select,", response.path]).execute();
		} else {
			await revealItemInDir(response.path);
		}
	} else {
		await openPath(response.path);
	}
};
</script>

<style scoped lang="scss">
.download-item {
	padding: 6px 8px;
	border-radius: 6px;
	background: var(--bg-tertiary, #282828);
	border: 1px solid var(--border, #2a2a2a);
	margin-bottom: 4px;
	transition: all 0.2s ease;

	&:last-child {
		margin-bottom: 0;
	}

	&:hover {
		background: var(--bg-hover, #2a2a2a);
		border-color: var(--border-secondary, #3a3a3a);
	}
}

.download-item-header {
	display: grid;
	grid-template-columns: auto 1fr;
	grid-template-areas: "cover info";
	column-gap: 6px;
	align-items: center;
}

.download-item-cover {
	grid-area: cover;
	border-radius: 4px;
	flex-shrink: 0;
	width: 32px;
	height: 32px;

	&.download-item-cover-playlist {
		border: 1px solid var(--border-secondary, #3a3a3a);
	}

	&.download-item-cover-audio {
		border: 1px solid transparent;
	}

	&.download-item-cover-ffmpeg {
		border: 1px dashed var(--border-secondary, #3a3a3a);
	}
}

.download-item-info {
	grid-area: info;
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.download-item-main {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.download-item-title-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 6px;
	min-width: 0;
}

.download-item-title {
	flex: 1;
	font-size: 12px;
	font-weight: 500;
	color: var(--text, #fff);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: 1.3;
}

.download-item-icons {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 2px;
	flex-shrink: 0;
}

.download-item-status-icon {
	flex-shrink: 0;
	width: 12px;
	height: 12px;
	transition: color 0.2s ease;

	&.status-preparing,
	&.status-processing {
		animation: spin 1.5s linear infinite;
	}
}

.download-item-explorer-button {
	background: transparent;
	border: none;
	cursor: pointer;
	padding: 0;
	border-radius: 3px;
	transition: all 0.2s;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 14px;
	height: 14px;
	line-height: 1;

	&:hover {
		background: var(--hover, #2a2a2a);
	}
}

.download-item-explorer-icon {
	color: var(--text-secondary, #b3b3b3);
	width: 12px;
	height: 12px;
	transition: color 0.2s;

	.download-item-explorer-button:hover & {
		color: var(--text, #fff);
	}
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.status-queued {
	color: var(--text-secondary, #b3b3b3);
}

.status-preparing {
	color: var(--text-secondary, #b3b3b3);
}

.status-downloading {
	color: var(--secondary, #e9003f);
}

.status-processing {
	color: var(--secondary, #e9003f);
}

.status-completed {
	color: #4caf50;
}

.status-failed {
	color: #f44336;
}

.download-item-subtitle {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 11px;
	color: var(--text-secondary, #b3b3b3);
	line-height: 1.3;
}

.download-item-artist {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.download-item-author {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.download-item-count {
	&::before {
		content: "•";
		margin: 0 3px;
		opacity: 0.6;
	}
}

.download-item-progress {
	margin-top: 2px;
}

.download-item-error {
	display: flex;
	align-items: center;
	gap: 4px;
	margin-top: 4px;
	padding: 4px 6px;
	font-size: 10px;
	color: #f44336;
	background: rgba(244, 67, 54, 0.1);
	border-radius: 3px;
	border-left: 2px solid #f44336;
	line-height: 1.3;

	span {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
	}
}

</style>

