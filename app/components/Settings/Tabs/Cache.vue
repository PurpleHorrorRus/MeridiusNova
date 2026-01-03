<template>
	<div class="settings-tab-cache">
		<div class="settings-section">
			<h2 class="section-title">{{ getString("settings.cache.title") }}</h2>
			<div class="settings-items">
				<div class="settings-item">
					<label class="settings-label">
						<input
							type="checkbox"
							:checked="settings.cache.enable"
							@change="updateCacheEnable"
							class="settings-checkbox"
						/>
						{{ getString("settings.cache.enable") }}
					</label>
				</div>

				<div v-if="settings.cache.enable" class="settings-item">
					<label class="settings-label">{{ getString("settings.cache.path") }}</label>
					<div class="settings-input-group">
						<input
							:value="settings.cache.path"
							type="text"
							class="settings-input"
							:placeholder="getString('settings.cache.pathPlaceholder')"
							readonly
						/>
						<button
							@click="chooseCachePath"
							class="settings-button"
						>
							{{ getString("settings.cache.choose") }}
						</button>
					</div>
				</div>

				<div v-if="settings.cache.enable" class="settings-item">
					<label class="settings-label">{{ getString("settings.cache.maxSize") }}</label>
					<div class="settings-input-group">
						<input
							:value="settings.cache.maxSize"
							@input="updateMaxSize"
							type="number"
							min="100"
							max="100000"
							class="settings-input"
							:placeholder="getString('settings.cache.maxSizePlaceholder')"
						/>
						<span class="settings-unit">MB</span>
					</div>
				</div>

				<div v-if="settings.cache.enable && cacheStats" class="settings-item">
					<div class="cache-stats">
						<div class="cache-stat">
							<span class="cache-stat-label">{{ getString("settings.cache.stats.size") }}:</span>
							<span class="cache-stat-value">{{ formatSize(cacheStats.size) }} / {{ formatSize(cacheStats.maxSize) }}</span>
						</div>
						<div class="cache-stat">
							<span class="cache-stat-label">{{ getString("settings.cache.stats.tracks") }}:</span>
							<span class="cache-stat-value">{{ cacheStats.tracks }}</span>
						</div>
						<div class="cache-progress-container">
							<div class="cache-progress-bar">
								<div
									class="cache-progress-filled"
									:style="{ width: `${cacheProgressPercent}%` }"
								></div>
								<div
									class="cache-progress-empty"
									:style="{ width: `${100 - cacheProgressPercent}%` }"
								></div>
							</div>
							<div class="cache-progress-text">
								<span class="cache-progress-used">{{ formatSize(cacheStats.size) }}</span>
								<span class="cache-progress-percent">{{ cacheProgressPercentRounded }}%</span>
								<span class="cache-progress-free">{{ formatSize(cacheStats.maxSize - cacheStats.size) }}</span>
							</div>
						</div>
					</div>
				</div>

				<div v-if="settings.cache.enable" class="settings-item">
					<button
						@click="clearCache"
						class="settings-button settings-button-danger"
						:disabled="clearing"
					>
						<Icon
							v-if="clearing"
							name="mdi:loading"
							class="settings-button-icon spinning"
						/>
						{{ clearing ? getString("settings.cache.clearing") : getString("settings.cache.clear") }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
const { getString } = useStrings();
const { settings, updateSection } = useSettings();

const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
const cacheStats = ref<{ size: number; tracks: number; sizeMB: number; maxSize: number; maxSizeMB: number } | null>(null);
const clearing = ref(false);

const cacheProgressPercent = computed(() => {
	if (!cacheStats.value || cacheStats.value.maxSize === 0) {
		return 0;
	}

	return Math.min(100, (cacheStats.value.size / cacheStats.value.maxSize) * 100);
});

const cacheProgressPercentRounded = computed(() => {
	return Math.round(cacheProgressPercent.value);
});

const updateCacheEnable = (event: Event) => {
	const target = event.target as HTMLInputElement;
	updateSection("cache", { enable: target.checked });

	if (target.checked) {
		loadCacheStats();
	} else {
		cacheStats.value = null;
	}
};

const chooseCachePath = async () => {
	if (isTauri && import.meta.client) {
		const { open } = await import("@tauri-apps/plugin-dialog");
		const selected = await open({
			directory: true,
			multiple: false
		});

		if (selected && typeof selected === "string") {
			updateSection("cache", { path: selected });
		}
	}
};

const updateMaxSize = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const value = parseInt(target.value, 10);

	if (!isNaN(value) && value >= 100 && value <= 100000) {
		updateSection("cache", { maxSize: value });
	}
};

const loadCacheStats = async () => {
	try {
		const { authenticatedFetch } = await import("~/utils/api");
		const stats = await authenticatedFetch<{ enabled: boolean; size: number; tracks: number; sizeMB: number; maxSize: number; maxSizeMB: number }>("/api/cache/stats");
		
		if (stats && stats.enabled) {
			cacheStats.value = stats;
		} else {
			cacheStats.value = null;
		}
	} catch (error) {
		console.error("Failed to load cache stats:", error);
		cacheStats.value = null;
	}
};

const clearCache = async () => {
	if (clearing.value) {
		return;
	}

	clearing.value = true;

	try {
		const { authenticatedFetch } = await import("~/utils/api");
		await authenticatedFetch("/api/cache/clear", {
			method: "POST"
		});

		await loadCacheStats();
	} catch (error) {
		console.error("Failed to clear cache:", error);
	} finally {
		clearing.value = false;
	}
};

const formatSize = (bytes: number): string => {
	if (bytes < 1024) {
		return `${bytes} B`;
	}

	if (bytes < 1024 * 1024) {
		return `${Math.round((bytes / 1024) * 100) / 100} KB`;
	}

	return `${Math.round((bytes / 1024 / 1024) * 100) / 100} MB`;
};

onMounted(async () => {
	if (settings.value.cache.enable) {
		await loadCacheStats();
	}

	const interval = setInterval(() => {
		if (settings.value.cache.enable) {
			loadCacheStats();
		}
	}, 30000);

	onUnmounted(() => {
		clearInterval(interval);
	});
});
</script>

<style scoped lang="scss">
.settings-tab-cache {
	display: flex;
	flex-direction: column;
	gap: 40px;
}

.settings-section {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.section-title {
	font-size: 20px;
	font-weight: 600;
	margin: 0;
	color: var(--text, #fff);
}

.settings-items {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.settings-item {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.settings-label {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;
	color: var(--text, #fff);
	cursor: pointer;
}

.settings-checkbox {
	width: 18px;
	height: 18px;
	cursor: pointer;
}

.settings-input-group {
	display: flex;
	align-items: center;
	gap: 8px;
}

.settings-input {
	flex: 1;
	padding: 8px 12px;
	background: var(--bg-secondary, #1a1a1a);
	border: 1px solid var(--border, #3a3a3a);
	border-radius: 4px;
	color: var(--text, #fff);
	font-size: 14px;

	&:focus {
		outline: none;
		border-color: var(--secondary, #e9003f);
	}

	&[readonly] {
		cursor: not-allowed;
		opacity: 0.7;
	}
}

.settings-unit {
	font-size: 14px;
	color: var(--text-secondary, #b3b3b3);
	padding: 0 8px;
}

.settings-button {
	padding: 8px 16px;
	background: var(--bg-tertiary, #2a2a2a);
	border: 1px solid var(--border, #3a3a3a);
	border-radius: 4px;
	color: var(--text, #fff);
	font-size: 14px;
	cursor: pointer;
	transition: all 0.2s;
	white-space: nowrap;
	display: flex;
	align-items: center;
	gap: 8px;

	&:hover:not(:disabled) {
		background: var(--bg-hover, #333);
		border-color: var(--secondary, #e9003f);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	&.settings-button-danger {
		background: var(--error, #e9003f);
		border-color: var(--error, #e9003f);

		&:hover:not(:disabled) {
			background: var(--error-hover, #d0003a);
		}
	}
}

.settings-button-icon {
	width: 16px;
	height: 16px;

	&.spinning {
		animation: spin 1s linear infinite;
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

.cache-stats {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 12px;
	background: var(--bg-secondary, #1a1a1a);
	border-radius: 4px;
}

.cache-stat {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.cache-stat-label {
	font-size: 14px;
	color: var(--text-secondary, #b3b3b3);
}

.cache-stat-value {
	font-size: 14px;
	font-weight: 600;
	color: var(--text, #fff);
}

.cache-progress-container {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-top: 12px;
}

.cache-progress-bar {
	display: flex;
	width: 100%;
	height: 24px;
	border-radius: 4px;
	overflow: hidden;
	background: var(--bg-tertiary, #2a2a2a);
}

.cache-progress-filled {
	height: 100%;
	background: var(--secondary, #e9003f);
	transition: width 0.3s ease;
}

.cache-progress-empty {
	height: 100%;
	background: var(--bg-tertiary, #2a2a2a);
	transition: width 0.3s ease;
}

.cache-progress-text {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 12px;
	color: var(--text-secondary, #b3b3b3);
}

.cache-progress-used {
	color: var(--secondary, #e9003f);
	font-weight: 600;
}

.cache-progress-percent {
	color: var(--text, #fff);
	font-weight: 600;
}

.cache-progress-free {
	color: var(--text-secondary, #b3b3b3);
}
</style>

