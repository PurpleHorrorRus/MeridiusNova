<template>
	<div class="modal-update">
		<div class="modal-update-header">
			<h2 class="modal-update-title">{{ getString("modal.update.title") }}</h2>
		</div>

		<div class="modal-update-content">
			<div class="update-info">
				<div v-if="updateInfo?.version" class="update-version">
					<span class="update-version-label">{{ getString("modal.update.newVersion") }}:</span>
					<span class="update-version-value">{{ updateInfo.version }}</span>
				</div>

				<div v-if="currentVersion" class="update-version">
					<span class="update-version-label">{{ getString("modal.update.currentVersion") }}:</span>
					<span class="update-version-value">{{ currentVersion }}</span>
				</div>

				<div v-if="updateInfo?.date" class="update-date">
					<Icon name="mdi:calendar" size="16" />
					<span>{{ formatDate(updateInfo.date) }}</span>
				</div>

				<div v-if="updateInfo?.size" class="update-size">
					<Icon name="mdi:download" size="16" />
					<span>{{ formatSize(updateInfo.size) }}</span>
				</div>
			</div>

			<div v-if="updateInfo?.body" class="update-description">
				<h3 class="update-description-title">{{ getString("modal.update.description") }}</h3>
				<div class="update-description-content" v-html="formatDescription(updateInfo.body)"></div>
			</div>

			<div v-if="updateError && !updateAvailable" class="update-error">
				<Icon name="mdi:alert-circle" size="20" />
				<span>{{ updateError }}</span>
			</div>
		</div>

		<div class="modal-update-actions">
			<button
				class="modal-update-button modal-update-button-cancel"
				@click="handleCancel"
				:disabled="installing"
			>
				{{ getString("modal.update.cancel") }}
			</button>
			<button
				class="modal-update-button modal-update-button-install"
				@click="handleInstall"
				:disabled="installing"
			>
				<Icon v-if="installing" name="mdi:loading" size="16" class="spinning" />
				<span>{{ installing ? getString("modal.update.installing") : getString("modal.update.install") }}</span>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useModalStore } from "~/stores/modal";
import { useSettingsStore } from "~/stores/settings";
import { useUpdater } from "~/composables/useUpdater";

const modalStore = useModalStore();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const { getString } = useStrings();
const { updateInfo, currentVersion, updateError, updateAvailable, checkForUpdates, installUpdate } = useUpdater();

const installing = ref(false);

onMounted(async () => {
	if (updateAvailable.value && !updateInfo.value) {
		await checkForUpdates();
	}
});

const handleInstall = async () => {
	installing.value = true;
	const success = await installUpdate();
	installing.value = false;

	if (success) {
		await modalStore.confirm();
	}
};

const handleCancel = async () => {
	await modalStore.cancel();
};

const formatDate = (dateString: string): string => {
	const date = new Date(dateString);
	const locale = settings.value.general.lang === "en" ? "en-US" : "ru-RU";
	return date.toLocaleDateString(locale, {
		year: "numeric",
		month: "long",
		day: "numeric"
	});
};

const formatSize = (bytes: number): string => {
	if (bytes < 1024) {
		return `${bytes} B`;
	}

	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(2)} KB`;
	}

	if (bytes < 1024 * 1024 * 1024) {
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	}

	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatDescription = (body: string): string => {
	return body
		.split("\n")
		.map((line) => {
			if (line.trim().startsWith("-") || line.trim().startsWith("*")) {
				return `<div class="update-description-item">${line.trim().substring(1).trim()}</div>`;
			}

			if (line.trim().startsWith("#")) {
				return `<div class="update-description-heading">${line.trim().substring(1).trim()}</div>`;
			}

			return line.trim() ? `<div class="update-description-line">${line.trim()}</div>` : "<br>";
		})
		.join("");
};
</script>

<style scoped lang="scss">
.modal-update {
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: 32px;
}

.modal-update-header {
	margin-bottom: 24px;
}

.modal-update-title {
	font-size: 24px;
	font-weight: 600;
	margin: 0;
	color: var(--text, #fff);
}

.modal-update-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 24px;
	overflow-y: auto;
}

.update-info {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.update-version {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;

	&-label {
		color: var(--text-secondary, #b3b3b3);
	}

	&-value {
		color: var(--text, #fff);
		font-weight: 500;
	}
}

.update-date,
.update-size {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 13px;
	color: var(--text-secondary, #b3b3b3);
}

.update-description {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.update-description-title {
	font-size: 16px;
	font-weight: 600;
	margin: 0;
	color: var(--text, #fff);
}

.update-description-content {
	font-size: 14px;
	line-height: 1.6;
	color: var(--text-secondary, #b3b3b3);

	:deep(.update-description-line) {
		margin-bottom: 8px;
	}

	:deep(.update-description-item) {
		margin-bottom: 6px;
		padding-left: 16px;
		position: relative;

		&::before {
			content: "•";
			position: absolute;
			left: 0;
			color: var(--secondary, #e9003f);
		}
	}

	:deep(.update-description-heading) {
		font-weight: 600;
		color: var(--text, #fff);
		margin-top: 12px;
		margin-bottom: 8px;
	}
}

.update-error {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 12px;
	background: rgba(233, 0, 63, 0.1);
	border: 1px solid rgba(233, 0, 63, 0.3);
	border-radius: 6px;
	color: var(--secondary, #e9003f);
	font-size: 14px;
}

.modal-update-actions {
	display: flex;
	gap: 12px;
	justify-content: flex-end;
	margin-top: 24px;
}

.modal-update-button {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 10px 24px;
	border: none;
	border-radius: 6px;
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: opacity 0.2s ease;
	min-width: 100px;

	&:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
}

.modal-update-button-cancel {
	background: var(--bg-tertiary, #282828);
	color: var(--text, #fff);

	&:hover:not(:disabled) {
		background: var(--bg-hover, #2a2a2a);
	}
}

.modal-update-button-install {
	background: var(--secondary, #e9003f);
	color: var(--text, #fff);

	&:hover:not(:disabled) {
		background: var(--primary-hover, #ff1a5c);
	}
}

.spinning {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}

	to {
		transform: rotate(360deg);
	}
}
</style>

