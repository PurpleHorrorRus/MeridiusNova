export const useServerCheck = () => {
	const checking = ref(false);
	const isAvailable = ref<boolean | null>(null);
	const error = ref<string | null>(null);

	const checkServer = async (url: string): Promise<boolean> => {
		if (!url) {
			error.value = "URL не указан";
			isAvailable.value = false;
			return false;
		}

		checking.value = true;
		error.value = null;
		isAvailable.value = null;

		const healthcheckUrl = url.endsWith("/") ? `${url}api/healthcheck` : `${url}/api/healthcheck`;

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000);

		const fetchFn = typeof window !== "undefined" && window.fetchCORS ? window.fetchCORS : fetch;

		const response = await fetchFn(healthcheckUrl, {
			method: "GET",
			signal: controller.signal,
			headers: {
				"Accept": "application/json"
			}
		}).catch((err: Error) => {
			clearTimeout(timeoutId);
			checking.value = false;

			if (err.name === "AbortError") {
				error.value = "Таймаут: сервер не отвечает";
			} else if (err.message) {
				error.value = err.message;
			} else {
				error.value = "Не удалось подключиться к серверу";
			}

			isAvailable.value = false;
			return null;
		});

		if (!response) {
			return false;
		}

		clearTimeout(timeoutId);

		if (response.status < 200 || response.status >= 300) {
			checking.value = false;
			error.value = `HTTP ${response.status}: ${response.statusText}`;
			isAvailable.value = false;
			return false;
		}

		const data = await response.json().catch(() => null);

		if (!data || data.status !== "ok") {
			checking.value = false;
			error.value = "Неверный формат ответа от сервера";
			isAvailable.value = false;
			return false;
		}

		checking.value = false;
		isAvailable.value = true;
		error.value = null;
		return true;
	};

	const reset = () => {
		checking.value = false;
		isAvailable.value = null;
		error.value = null;
	};

	return {
		checking: readonly(checking),
		isAvailable: readonly(isAvailable),
		error: readonly(error),
		checkServer,
		reset
	};
};

