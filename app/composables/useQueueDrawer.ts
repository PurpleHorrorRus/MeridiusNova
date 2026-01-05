import { ref } from "vue";

const isQueueDrawerOpen = ref(false);

export const useQueueDrawer = () => {
	const openQueueDrawer = () => {
		isQueueDrawerOpen.value = true;
	};

	const closeQueueDrawer = () => {
		isQueueDrawerOpen.value = false;
	};

	const toggleQueueDrawer = () => {
		isQueueDrawerOpen.value = !isQueueDrawerOpen.value;
	};

	return {
		isQueueDrawerOpen,
		openQueueDrawer,
		closeQueueDrawer,
		toggleQueueDrawer
	};
};














