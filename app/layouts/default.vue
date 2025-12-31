<template>
	<div class="layout" id="default" :style="gridStyle">
		<header v-if="isTauri" class="layout-header">
			<Titlebar />
		</header>

		<div class="layout-body">
			<Sidebar />

			<main ref="mainContainerRef" class="layout-main">
				<slot />
			</main>
		</div>

		<Player />

		<Modal />
	</div>
</template>

<script setup lang="ts">
const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
const mainContainerRef = ref<HTMLElement | null>(null);

const gridStyle = computed(() => {
	if (isTauri) {
		return {
			gridTemplateRows: "30px 1fr auto",
			"--body-row": "2"
		};
	}

	return {
		gridTemplateRows: "1fr auto",
		"--body-row": "1"
	};
});
</script>

<style scoped lang="scss">
#default {
	display: grid;
	height: 100vh;
	overflow: hidden;
}

.layout-header {
	grid-row: 1;
	z-index: 100;
}

.layout-body {
	grid-row: var(--body-row, 1);
	display: flex;
	height: 100%;
	overflow: hidden;
}

.layout-main {
	flex: 1;
	height: 100%;
	overflow-y: auto;
	overflow-x: hidden;
	background: var(--bg-primary, #121212);
	padding-bottom: 108px; // ~76px высота плеера + 32px отступы
}
</style>