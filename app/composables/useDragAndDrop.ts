import type { Ref } from "vue";

export const useDragAndDrop = <T extends { [key: string]: any }>(
	items: Ref<T[]>,
	onReorder: (newOrder: T[], originalOrder?: T[], fromIndex?: number, toIndex?: number) => Promise<void> | void,
	options: {
		getItemId?: (item: T) => string | number;
		isDisabled?: () => boolean;
	} = {}
) => {
	const draggedIndex = ref<number | null>(null);
	const draggedOverIndex = ref<number | null>(null);
	const isDragging = ref(false);
	const dragStartPos = ref<{ x: number; y: number } | null>(null);
	const dragOffset = ref<{ x: number; y: number } | null>(null);
	const currentDragElement = ref<HTMLElement | null>(null);
	const ghostElement = ref<HTMLElement | null>(null);

	const getItemId = options.getItemId || ((item: T) => (item as any).id || (item as any).full_id);
	const isDisabled = options.isDisabled || (() => false);

	const handleMouseDown = (event: MouseEvent, index: number) => {
		if (isDisabled() || event.button !== 0) {
			return;
		}

		console.log("[DragAndDrop] handleMouseDown", { index });

		const target = event.currentTarget as HTMLElement;
		if (!target) {
			return;
		}

		dragStartPos.value = { x: event.clientX, y: event.clientY };
		currentDragElement.value = target;

		// Вычисляем смещение клика относительно элемента
		const originalElement = target.querySelector(".song") as HTMLElement;
		if (originalElement) {
			const rect = originalElement.getBoundingClientRect();
			dragOffset.value = {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top
			};
		} else {
			dragOffset.value = { x: 0, y: 0 };
		}

		const handleMouseMove = (moveEvent: MouseEvent) => {
			if (!dragStartPos.value) {
				return;
			}

			const deltaX = Math.abs(moveEvent.clientX - dragStartPos.value.x);
			const deltaY = Math.abs(moveEvent.clientY - dragStartPos.value.y);

			// Начинаем drag только если мышь переместилась на достаточное расстояние
			if (deltaX > 5 || deltaY > 5) {
				if (!isDragging.value) {
					console.log("[DragAndDrop] Starting drag", { index });
					isDragging.value = true;
					draggedIndex.value = index;

					if (currentDragElement.value) {
						// Создаем ghost-элемент
						const originalElement = currentDragElement.value.querySelector(".song") as HTMLElement;
						if (originalElement && dragOffset.value) {
							const rect = originalElement.getBoundingClientRect();
							const ghost = originalElement.cloneNode(true) as HTMLElement;
							
							// Применяем стили к ghost
							ghost.style.position = "fixed";
							ghost.style.pointerEvents = "none";
							ghost.style.zIndex = "10000";
							ghost.style.opacity = "0.9";
							ghost.style.transform = "rotate(2deg) scale(1.02)";
							ghost.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(233, 0, 63, 0.2)";
							ghost.style.width = `${rect.width}px`;
							ghost.style.height = `${rect.height}px`;
							// Используем смещение клика как якорь
							ghost.style.left = `${moveEvent.clientX - dragOffset.value.x}px`;
							ghost.style.top = `${moveEvent.clientY - dragOffset.value.y}px`;
							ghost.style.transition = "none";
							ghost.style.borderRadius = "8px";
							ghost.style.background = "var(--bg-secondary, #181818)";
							ghost.style.backdropFilter = "blur(10px)";
							ghost.style.setProperty("-webkit-backdrop-filter", "blur(10px)");
							ghost.classList.add("drag-ghost");
							
							// Отключаем анимации и интерактивные элементы в ghost
							const allElements = ghost.querySelectorAll("*");
							allElements.forEach((el) => {
								const htmlEl = el as HTMLElement;
								htmlEl.style.pointerEvents = "none";
								htmlEl.style.transition = "none";
							});
							
							document.body.appendChild(ghost);
							ghostElement.value = ghost;
						}

						currentDragElement.value.style.opacity = "0.3";
						currentDragElement.value.style.cursor = "move";
						const songElement = currentDragElement.value.querySelector(".song") as HTMLElement;
						if (songElement) {
							songElement.style.pointerEvents = "none";
						}
					}

					document.body.style.cursor = "move";
					document.body.style.userSelect = "none";
				}

				// Обновляем позицию ghost-элемента с учетом смещения клика
				if (ghostElement.value && dragOffset.value) {
					ghostElement.value.style.left = `${moveEvent.clientX - dragOffset.value.x}px`;
					ghostElement.value.style.top = `${moveEvent.clientY - dragOffset.value.y}px`;
				}

				// Находим элемент под курсором
				// Временно скрываем ghost, чтобы найти реальный элемент под ним
				if (ghostElement.value) {
					ghostElement.value.style.pointerEvents = "none";
					ghostElement.value.style.display = "none";
				}
				
				const elementBelow = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
				
				if (ghostElement.value) {
					ghostElement.value.style.display = "";
					ghostElement.value.style.pointerEvents = "none";
				}
				
				if (elementBelow) {
					const dragHandle = elementBelow.closest(".song-drag-handle") as HTMLElement;
					if (dragHandle) {
						const wrapper = dragHandle.closest(".song-wrapper") as HTMLElement;
						if (wrapper) {
							const allWrappers = Array.from(document.querySelectorAll(".song-wrapper"));
							const newIndex = allWrappers.indexOf(wrapper);
							if (newIndex !== -1 && newIndex !== draggedIndex.value) {
								draggedOverIndex.value = newIndex;
								console.log("[DragAndDrop] Drag over", { index: newIndex });
							}
						}
					} else {
						// Пытаемся найти wrapper напрямую
						const wrapper = elementBelow.closest(".song-wrapper") as HTMLElement;
						if (wrapper) {
							const allWrappers = Array.from(document.querySelectorAll(".song-wrapper"));
							const newIndex = allWrappers.indexOf(wrapper);
							if (newIndex !== -1 && newIndex !== draggedIndex.value) {
								draggedOverIndex.value = newIndex;
								console.log("[DragAndDrop] Drag over (wrapper)", { index: newIndex });
							}
						}
					}
				}
			}
		};

		const handleMouseUp = (upEvent: MouseEvent) => {
			console.log("[DragAndDrop] handleMouseUp", { isDragging: isDragging.value, draggedIndex: draggedIndex.value, draggedOverIndex: draggedOverIndex.value });

			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";

			if (isDragging.value && draggedIndex.value !== null) {
				let toIndex = draggedOverIndex.value;

				// Если draggedOverIndex не установлен, пытаемся найти элемент под курсором
				if (toIndex === null) {
					// Временно скрываем ghost, чтобы найти реальный элемент под ним
					if (ghostElement.value) {
						ghostElement.value.style.display = "none";
					}
					
					const elementBelow = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
					
					if (ghostElement.value) {
						ghostElement.value.style.display = "";
					}
					
					if (elementBelow) {
						const dragHandle = elementBelow.closest(".song-drag-handle") as HTMLElement;
						if (dragHandle) {
							const wrapper = dragHandle.closest(".song-wrapper") as HTMLElement;
							if (wrapper) {
								const allWrappers = Array.from(document.querySelectorAll(".song-wrapper"));
								toIndex = allWrappers.indexOf(wrapper);
								console.log("[DragAndDrop] Found element under cursor", { toIndex, elementBelow: elementBelow.tagName });
							}
						} else {
							// Пытаемся найти wrapper напрямую
							const wrapper = elementBelow.closest(".song-wrapper") as HTMLElement;
							if (wrapper) {
								const allWrappers = Array.from(document.querySelectorAll(".song-wrapper"));
								toIndex = allWrappers.indexOf(wrapper);
								console.log("[DragAndDrop] Found wrapper under cursor", { toIndex });
							}
						}
					}
				}

				const fromIndex = draggedIndex.value;

				console.log("[DragAndDrop] Drop check", { fromIndex, toIndex, isDragging: isDragging.value });

				if (toIndex !== null && toIndex !== -1 && fromIndex !== toIndex) {
					console.log("[DragAndDrop] Dropping", { fromIndex, toIndex });
					handleDropInternal(fromIndex, toIndex);
				} else {
					console.log("[DragAndDrop] No valid drop target", { fromIndex, toIndex, reason: toIndex === null ? "toIndex is null" : toIndex === -1 ? "toIndex is -1" : "fromIndex === toIndex" });
				}
			} else {
				console.log("[DragAndDrop] Not dragging or no draggedIndex", { isDragging: isDragging.value, draggedIndex: draggedIndex.value });
			}

			// Удаляем ghost-элемент
			if (ghostElement.value) {
				ghostElement.value.style.transition = "opacity 0.2s ease";
				ghostElement.value.style.opacity = "0";
				setTimeout(() => {
					if (ghostElement.value && document.body.contains(ghostElement.value)) {
						document.body.removeChild(ghostElement.value);
					}
					ghostElement.value = null;
				}, 200);
			}

			// Сброс состояния
			if (currentDragElement.value) {
				currentDragElement.value.style.opacity = "";
				currentDragElement.value.style.cursor = "";
				const songElement = currentDragElement.value.querySelector(".song") as HTMLElement;
				if (songElement) {
					songElement.style.pointerEvents = "";
				}
			}

			draggedIndex.value = null;
			draggedOverIndex.value = null;
			isDragging.value = false;
			dragStartPos.value = null;
			dragOffset.value = null;
			currentDragElement.value = null;
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
	};

	const handleDropInternal = async (fromIndex: number, toIndex: number) => {
		if (fromIndex === toIndex) {
			return;
		}

		console.log("[DragAndDrop] Moving item", { fromIndex, toIndex, itemsCount: items.value.length });

		const originalItems = [...items.value];
		const newItems = [...items.value];
		const [movedItem] = newItems.splice(fromIndex, 1);

		if (!movedItem) {
			console.warn("[DragAndDrop] No item to move");
			return;
		}

		newItems.splice(toIndex, 0, movedItem);

		// Обновляем UI сразу для лучшего UX
		items.value = newItems;

		console.log("[DragAndDrop] Calling onReorder", { newItemsCount: newItems.length, originalItemsCount: originalItems.length, fromIndex, toIndex });
		try {
			await onReorder(newItems, originalItems, fromIndex, toIndex);
			console.log("[DragAndDrop] onReorder completed");
		} catch (error) {
			console.error("[DragAndDrop] onReorder failed, reverting", error);
			// Откатываем изменения в случае ошибки
			items.value = originalItems;
			throw error;
		}
	};

	// Обработчики для обратной совместимости (если где-то еще используются)
	const handleDragStart = (event: DragEvent, index: number) => {
		// Не используем нативный drag-and-drop
		event.preventDefault();
		return false;
	};

	const handleDragEnd = (event: DragEvent) => {
		event.preventDefault();
	};

	const handleDragOver = (event: DragEvent, index: number) => {
		event.preventDefault();
	};

	const handleDragLeave = () => {
		// Не используется в кастомном решении
	};

	const handleDrop = async (event: DragEvent, index: number) => {
		event.preventDefault();
	};

	return {
		draggedIndex,
		draggedOverIndex,
		isDragging,
		handleMouseDown,
		handleDragStart,
		handleDragEnd,
		handleDragOver,
		handleDragLeave,
		handleDrop
	};
};
