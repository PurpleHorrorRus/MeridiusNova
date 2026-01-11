<template>
	<div class="hotkey-input">
		<input
			:value="displayValue"
			@click="handleClick"
			@keydown="handleKeyDown"
			@blur="handleBlur"
			readonly
			class="hotkey-input-field"
			:class="{ listening: isListening }"
		/>
		<button
			v-if="value"
			@click="clear"
			class="hotkey-clear"
		>
			<Icon name="mdi:close" size="16" />
		</button>
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{
	value: string;
}>();

const emit = defineEmits<{
	change: [value: string];
}>();

const isListening = ref(false);
const displayValue = computed(() => {
	if (isListening.value) {
		return "...";
	}
	return props.value || "";
});

const handleClick = () => {
	isListening.value = true;
};

const handleKeyDown = (event: KeyboardEvent) => {
	event.preventDefault();
	isListening.value = true;

	const keys: string[] = [];

	if (event.ctrlKey) {
		keys.push("Ctrl");
	}
	if (event.altKey) {
		keys.push("Alt");
	}
	if (event.shiftKey) {
		keys.push("Shift");
	}
	if (event.metaKey) {
		keys.push("Meta");
	}

	if (event.key && event.key !== "Control" && event.key !== "Alt" && event.key !== "Shift" && event.key !== "Meta") {
		keys.push(event.key);
	}

	if (keys.length > 0) {
		const accelerator = keys.join("+");
		emit("change", accelerator);
		isListening.value = false;
	}
};

const handleBlur = () => {
	isListening.value = false;
};

const clear = () => {
	emit("change", "");
};
</script>

<style scoped lang="scss">
.hotkey-input {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;
}

.hotkey-input-field {
	padding: 10px 16px;
	background: var(--bg-tertiary, #2a2a2a);
	border: 2px solid var(--border, #3a3a3a);
	border-radius: 6px;
	color: var(--text, #fff);
	font-size: 13px;
	font-weight: 500;
	font-family: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
	outline: none;
	min-width: 220px;
	cursor: pointer;
	transition: all 0.2s ease;
	text-align: center;
	letter-spacing: 0.5px;

	&:focus {
		border-color: var(--secondary, #e9003f);
		box-shadow: 0 0 0 3px rgba(233, 0, 63, 0.15);
	}

	&.listening {
		border-color: var(--secondary, #e9003f);
		background: rgba(233, 0, 63, 0.1);
		box-shadow: 0 0 0 3px rgba(233, 0, 63, 0.2);
		animation: pulse 1.5s ease-in-out infinite;
	}
}

.hotkey-clear {
	background: var(--bg-tertiary, #2a2a2a);
	border: 1px solid var(--border, #3a3a3a);
	border-radius: 6px;
	cursor: pointer;
	padding: 6px;
	color: var(--text-secondary, #b3b3b3);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s ease;
	width: 32px;
	height: 32px;
	flex-shrink: 0;

	&:active {
		transform: scale(0.95);
	}
}

@keyframes pulse {
	0%, 100% {
		opacity: 1;
		box-shadow: 0 0 0 3px rgba(233, 0, 63, 0.2);
	}
	50% {
		opacity: 0.8;
		box-shadow: 0 0 0 6px rgba(233, 0, 63, 0.1);
	}
}
</style>
