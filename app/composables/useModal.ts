import type { ModalConfirmProps, ModalCustomProps } from "~/stores/modal";

export const useModal = () => {
	const modalStore = useModalStore();

	const openModal = (
		type: "confirm" | "settings" | "custom" | "editTrack" | "lyrics" | "shareAudio",
		props?: ModalConfirmProps | ModalCustomProps | Record<string, any>,
		callbacks?: {
			onConfirm?: () => void | Promise<void>;
			onCancel?: () => void | Promise<void>;
		}
	) => {
		modalStore.open(type, props || {}, callbacks);
	};

	const openConfirm = (
		props: ModalConfirmProps,
		callbacks?: {
			onConfirm?: () => void | Promise<void>;
			onCancel?: () => void | Promise<void>;
		}
	): Promise<boolean> => {
		return new Promise((resolve) => {
			modalStore.open("confirm", props, {
				onConfirm: async () => {
					if (callbacks?.onConfirm) {
						await callbacks.onConfirm();
					}
					resolve(true);
				},
				onCancel: async () => {
					if (callbacks?.onCancel) {
						await callbacks.onCancel();
					}
					resolve(false);
				}
			});
		});
	};

	const openSettings = () => {
		modalStore.open("settings", {});
	};

	const openCustom = (
		component: any,
		props?: Record<string, any>,
		callbacks?: {
			onConfirm?: () => void | Promise<void>;
			onCancel?: () => void | Promise<void>;
		}
	) => {
		modalStore.open("custom", {
			component,
			props: props || {}
		}, callbacks);
	};

	const closeModal = () => {
		modalStore.close();
	};

	return {
		openModal,
		openConfirm,
		openSettings,
		openCustom,
		closeModal
	};
};

