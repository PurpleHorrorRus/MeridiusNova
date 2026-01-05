import { isTauri as checkTauri } from "~/utils/tauri";
import { inject, provide, ref, type Ref } from "vue";

const IS_TAURI_KEY = Symbol("isTauri");

let cachedIsTauri: boolean | null = null;

const getIsTauri = (): boolean => {
	if (cachedIsTauri === null) {
		cachedIsTauri = checkTauri();
	}
	return cachedIsTauri;
};

export const useIsTauri = () => {
	const injected = inject<Ref<boolean> | undefined>(IS_TAURI_KEY, undefined);

	if (injected) {
		return {
			isTauri: injected
		};
	}

	const isTauri = ref(getIsTauri());

	provide(IS_TAURI_KEY, isTauri);

	return {
		isTauri
	};
};

