<template>
	<label class="settings-checkbox-label">
		<input
			type="checkbox"
			:checked="checked"
			:disabled="disabled"
			class="settings-checkbox-input"
			@change="handleChange"
		/>
		<span class="settings-checkbox-content"><slot /></span>
	</label>
</template>

<script setup lang="ts">
interface Props {
	checked: boolean;
	disabled?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ (e: "update", value: boolean): void }>();

const handleChange = (event: Event) => {
	const target = event.target as HTMLInputElement;
	emit("update", target.checked);
};
</script>

<style scoped lang="scss">
.settings-checkbox-label {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 14px;
	font-weight: 500;
	color: var(--text, #fff);
	cursor: pointer;
	line-height: 1.5;
	user-select: none;
}

.settings-checkbox-input {
	width: 20px;
	height: 20px;
	margin: 0;
	flex-shrink: 0;
	cursor: pointer;
	accent-color: var(--secondary, #e9003f);

	&:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
}

.settings-checkbox-content {
	flex: 1;
	min-width: 0;
}
</style>
