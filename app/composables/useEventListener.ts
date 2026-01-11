import { onMounted, onUnmounted, type Ref } from "vue";

export function useEventListener<T extends keyof WindowEventMap>(
	target: Window,
	event: T,
	handler: (event: WindowEventMap[T]) => void,
	options?: boolean | AddEventListenerOptions
): void;

export function useEventListener<T extends keyof DocumentEventMap>(
	target: Document,
	event: T,
	handler: (event: DocumentEventMap[T]) => void,
	options?: boolean | AddEventListenerOptions
): void;

export function useEventListener<T extends keyof HTMLElementEventMap>(
	target: Ref<HTMLElement | null> | HTMLElement,
	event: T,
	handler: (event: HTMLElementEventMap[T]) => void,
	options?: boolean | AddEventListenerOptions
): void;

export function useEventListener(
	target: Window | Document | Ref<HTMLElement | null> | HTMLElement | null | undefined,
	event: string,
	handler: (event: Event) => void,
	options?: boolean | AddEventListenerOptions
): void {
	if (!import.meta.client) {
		return;
	}

	if (!target) {
		return;
	}

	const isRef = typeof target === "object" && target !== null && "value" in target;

	onMounted(() => {
		if (!import.meta.client) {
			return;
		}

		const currentElement = isRef ? (target as Ref<HTMLElement | null>).value : target;
		if (currentElement) {
			currentElement.addEventListener(event, handler, options);
		}
	});

	onUnmounted(() => {
		if (!import.meta.client) {
			return;
		}

		const currentElement = isRef ? (target as Ref<HTMLElement | null>).value : target;
		if (currentElement) {
			currentElement.removeEventListener(event, handler, options);
		}
	});
}

