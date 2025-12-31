<template>
	<div class="download-progress">
		<div class="download-progress-bar">
			<div
				class="download-progress-fill"
				:style="{ width: `${percent}%` }"
			/>
		</div>
		<span class="download-progress-text">{{ Math.round(percent) }}%</span>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	percent: number;
}>();
</script>

<style scoped lang="scss">
.download-progress {
	display: flex;
	align-items: center;
	gap: 6px;
}

.download-progress-bar {
	flex: 1;
	height: 3px;
	background: var(--bg-secondary, #1a1a1a);
	border-radius: 2px;
	overflow: hidden;
}

.download-progress-fill {
	height: 100%;
	background: var(--secondary, #e9003f);
	border-radius: 2px;
	transition: width 0.3s ease;
}

.download-progress-text {
	font-size: 10px;
	color: var(--text-secondary, #b3b3b3);
	min-width: 32px;
	text-align: right;
}
</style>

