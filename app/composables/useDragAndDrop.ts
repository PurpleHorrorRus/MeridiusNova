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
	const originalElementRect = ref<DOMRect | null>(null);

	const isDisabled = options.isDisabled ?? (() => false);

	const handleMouseDown = (event: MouseEvent, index: number) => {
		if (isDisabled() || event.button !== 0) {
			return;
		}

		const target = event.currentTarget as HTMLElement;
		if (!target) {
			return;
		}

		const dragHandle = target.closest(".song-drag-handle") as HTMLElement || target;
		dragStartPos.value = { x: event.clientX, y: event.clientY };
		currentDragElement.value = dragHandle;

		const originalElement = ((event.target as HTMLElement)?.closest(".song") || dragHandle.querySelector(".song")) as HTMLElement;
		
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

			if ((deltaX > 5 || deltaY > 5) && !isDragging.value) {
				isDragging.value = true;
				draggedIndex.value = index;

				if (currentDragElement.value && dragOffset.value) {
					const songElement = currentDragElement.value.querySelector(".song") as HTMLElement || (currentDragElement.value.closest(".song-wrapper")?.querySelector(".song") as HTMLElement);
					
					if (songElement) {
						const rect = songElement.getBoundingClientRect();
						originalElementRect.value = rect;
						const ghost = songElement.cloneNode(true) as HTMLElement;
						
						Object.assign(ghost.style, {
							position: "fixed",
							pointerEvents: "none",
							zIndex: "10000",
							opacity: "0.9",
							transform: "rotate(2deg) scale(1.02)",
							boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(233, 0, 63, 0.2)",
							width: `${rect.width}px`,
							height: `${rect.height}px`,
							left: `${moveEvent.clientX - dragOffset.value.x}px`,
							top: `${moveEvent.clientY - dragOffset.value.y}px`,
							transition: "none",
							borderRadius: "8px",
							background: "var(--bg-secondary, #181818)"
						});
						
						ghost.classList.add("drag-ghost");
						
						ghost.querySelectorAll("*").forEach((el) => {
							Object.assign((el as HTMLElement).style, {
								pointerEvents: "none",
								transition: "none"
							});
						});
						
						document.body.appendChild(ghost);
						ghostElement.value = ghost;
					}

					Object.assign(currentDragElement.value.style, {
						opacity: "0",
						visibility: "hidden",
						cursor: "move"
					});
					
					const innerSong = currentDragElement.value.querySelector(".song") as HTMLElement;
					if (innerSong) {
						innerSong.style.pointerEvents = "none";
					}
				}

				document.body.style.cursor = "move";
				document.body.style.userSelect = "none";
			}

			if (isDragging.value) {
				if (ghostElement.value && dragOffset.value) {
					ghostElement.value.style.left = `${moveEvent.clientX - dragOffset.value.x}px`;
					ghostElement.value.style.top = `${moveEvent.clientY - dragOffset.value.y}px`;
				}

				let foundIndex: number | null = null;
				
				if (originalElementRect.value && draggedIndex.value !== null) {
					const rect = originalElementRect.value;
					const tolerance = 10;
					if (moveEvent.clientX >= rect.left - tolerance && moveEvent.clientX <= rect.right + tolerance && moveEvent.clientY >= rect.top - tolerance && moveEvent.clientY <= rect.bottom + tolerance) {
						foundIndex = draggedIndex.value;
					}
				}
				
				if (foundIndex === null) {
					if (ghostElement.value) {
						ghostElement.value.style.display = "none";
					}
					
					const elementBelow = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
					
					if (ghostElement.value) {
						ghostElement.value.style.display = "";
					}
					
					if (elementBelow && draggedIndex.value !== null) {
						const wrapper = (elementBelow.closest(".song-drag-handle")?.closest(".song-wrapper") || elementBelow.closest(".song-wrapper")) as HTMLElement;
						
						if (wrapper) {
							const listContainer = wrapper.closest(".song-list, .song-list-virtualized") as HTMLElement;
							if (listContainer) {
								const allWrappers = Array.from(listContainer.querySelectorAll(".song-wrapper"));
								const currentIndex = allWrappers.indexOf(wrapper);
								
								if (currentIndex !== -1) {
									const wrapperRect = wrapper.getBoundingClientRect();
									const insertIndex = Math.max(0, Math.min(allWrappers.length - 1, (moveEvent.clientY - wrapperRect.top < wrapperRect.height / 2 ? currentIndex : currentIndex + 1) - (currentIndex > draggedIndex.value ? 1 : 0)));
									foundIndex = insertIndex;
								}
							}
						}
					}
				}
				
				if (foundIndex !== null && foundIndex !== draggedOverIndex.value) {
					draggedOverIndex.value = foundIndex;
				}
			}
		};

		const handleMouseUp = (upEvent: MouseEvent) => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";

			if (isDragging.value && draggedIndex.value !== null) {
				let toIndex = draggedOverIndex.value;

				if (toIndex === null) {
					if (ghostElement.value) {
						ghostElement.value.style.display = "none";
					}
					
					const elementBelow = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
					
					if (ghostElement.value) {
						ghostElement.value.style.display = "";
					}
					
					if (elementBelow) {
						const wrapper = (elementBelow.closest(".song-drag-handle")?.closest(".song-wrapper") || elementBelow.closest(".song-wrapper")) as HTMLElement;
						
						if (wrapper) {
							const listContainer = wrapper.closest(".song-list, .song-list-virtualized") as HTMLElement;
							if (listContainer) {
								const allWrappers = Array.from(listContainer.querySelectorAll(".song-wrapper"));
								toIndex = allWrappers.indexOf(wrapper);
							}
						}
					}
				}

				const fromIndex = draggedIndex.value;

				if (toIndex !== null && toIndex !== -1 && fromIndex !== toIndex) {
					handleDropInternal(fromIndex, toIndex);
				}
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

			if (currentDragElement.value) {
				Object.assign(currentDragElement.value.style, {
					opacity: "",
					visibility: "",
					cursor: ""
				});
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
			originalElementRect.value = null;
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
	};

	const handleDropInternal = async (fromIndex: number, toIndex: number) => {
		if (fromIndex === toIndex) {
			return;
		}

		const originalItems = [...items.value];
		const newItems = [...items.value];
		const [movedItem] = newItems.splice(fromIndex, 1);
		
		if (movedItem) {
			newItems.splice(toIndex, 0, movedItem);
			items.value = newItems;

			try {
				await onReorder(newItems, originalItems, fromIndex, toIndex);
			} catch (error) {
				items.value = originalItems;
				throw error;
			}
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
