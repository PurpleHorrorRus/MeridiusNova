<template>
	<div class="layout" id="default" :style="gridStyle">
		<header v-if="isTauri" class="layout-header">
			<Titlebar />
		</header>

	<div class="layout-body">
		<ClientOnly>
			<Sidebar v-if="!isMobile" />
			<MobileSidebar v-else />
			<template #fallback>
				<Sidebar />
			</template>
		</ClientOnly>

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

provide("layoutMainRef", mainContainerRef);

const { isMobile } = useIsMobile();

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

	@media (max-width: 600px) {
		:deep(.mobile-sidebar.mobile-only-bottom-nav) {
			flex: 0 0 0;
			min-width: 0;
			width: 0;
		}
	}
}

.layout-main {
	flex: 1;
	height: 100%;
	overflow-y: auto;
	overflow-x: hidden;
	background: var(--bg-primary, #121212);
	padding-bottom: 108px; // ~76px высота плеера + 32px отступы
	
	/* Adjust padding for mobile bottom navigation */
	@media (max-width: 768px) {
		padding-bottom: 60px; // Height of bottom navigation
	}
}
</style>
