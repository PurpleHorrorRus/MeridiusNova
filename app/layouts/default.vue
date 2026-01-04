<template>
	<div class="layout" id="default" :style="gridStyle">
	<header v-if="isTauri && !isNativeFullscreen" class="layout-header">
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

		<QueueDrawer />
	</div>
</template>

<script setup lang="ts">
const mainContainerRef = ref<HTMLElement | null>(null);

provide("layoutMainRef", mainContainerRef);

const { isMobile } = useIsMobile();
const { isNativeFullscreen } = useNativeFullscreen();

const isTauri = ref(false);

onMounted(() => {
	isTauri.value = typeof window !== "undefined" && "__TAURI__" in window;
});

const gridStyle = computed(() => {
	if (isTauri.value && !isNativeFullscreen.value) {
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
	grid-column: 1 / -1;
	width: 100%;
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
	
	@media (max-width: 800px) {
		padding-bottom: 100px; // 80px высота плеера + 12px bottom + 8px отступ
	}
	
	@media (max-width: 700px) {
		padding-bottom: 92px; // 76px высота плеера + 8px bottom + 8px отступ
	}
	
	@media (max-width: 600px) {
		padding-bottom: 144px; // 72px высота плеера + 64px bottom + 8px отступ
	}
	
	@media (max-width: 480px) {
		padding-bottom: 140px; // 72px высота плеера + 60px bottom + 8px отступ
	}
}
</style>
