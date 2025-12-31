export const useIndexStore = defineStore("index", {
	state: () => ({
        mainContainerRef: null as HTMLElement | null
	}),

	actions: {
        setMainContainerRef(ref: HTMLElement) {
            this.mainContainerRef = ref;
        }
    }
});

