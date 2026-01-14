export interface ModalConfirmProps {
	title?: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
}

export interface ModalCustomProps {
	component: any;
	props?: Record<string, any>;
	title?: string;
}

type ModalType = "confirm" | "settings" | "custom" | "editTrack" | "lyrics" | "shareAudio" | "songActions" | "update" | null;

interface ModalState {
	isOpen: boolean;
	type: ModalType;
	props: ModalConfirmProps | ModalCustomProps | Record<string, any>;
	onConfirm?: () => void | Promise<void>;
	onCancel?: () => void | Promise<void>;
}

export const useModalStore = defineStore("modal", {
	state: (): ModalState => ({
		isOpen: false,
		type: null,
		props: {},
		onConfirm: undefined,
		onCancel: undefined
	}),

	actions: {
		open(type: ModalType, props: ModalConfirmProps | ModalCustomProps | Record<string, any> = {}, callbacks?: {
			onConfirm?: () => void | Promise<void>;
			onCancel?: () => void | Promise<void>;
		}) {
			this.type = type;
			this.props = props;
			this.onConfirm = callbacks?.onConfirm;
			this.onCancel = callbacks?.onCancel;
			this.isOpen = true;
		},

		close() {
			this.isOpen = false;
			this.type = null;
			this.props = {};
			this.onConfirm = undefined;
			this.onCancel = undefined;
		},

		async confirm() {
			if (this.onConfirm) {
				await this.onConfirm();
			}
			this.close();
		},

		async cancel() {
			if (this.onCancel) {
				await this.onCancel();
			}
			this.close();
		},

		openModal(
			type: ModalType,
			props: ModalConfirmProps | ModalCustomProps | Record<string, any> = {},
			callbacks?: {
				onConfirm?: () => void | Promise<void>;
				onCancel?: () => void | Promise<void>;
			}
		) {
			this.open(type, props || {}, callbacks);
		},

		async openConfirm(
			props: ModalConfirmProps,
			callbacks?: {
				onConfirm?: () => void | Promise<void>;
				onCancel?: () => void | Promise<void>;
			}
		): Promise<boolean> {
			return new Promise((resolve) => {
				this.open("confirm", props, {
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
		},

		openSettings() {
			this.open("settings", {});
		},

		openCustom(
			component: any,
			props?: Record<string, any>,
			callbacks?: {
				onConfirm?: () => void | Promise<void>;
				onCancel?: () => void | Promise<void>;
			}
		) {
			this.open("custom", {
				component,
				props: props || {}
			}, callbacks);
		},

		openUpdate() {
			this.open("update", {});
		}
	}
});

