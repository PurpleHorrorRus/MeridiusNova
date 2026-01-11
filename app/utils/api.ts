import { useAuthInit } from "~/composables/useAuthInit";

type FetchOptions = Parameters<typeof $fetch>[1];

let isReauthenticating = false;
const reauthQueue: Array<() => Promise<any>> = [];

const processReauthQueue = async () => {
	if (reauthQueue.length === 0) {
		return;
	}

	const queue = [...reauthQueue];
	reauthQueue.length = 0;

	for (const retryFn of queue) {
		await retryFn().catch((error) => {
			console.error("Failed to retry request after reauth:", error);
		});
	}
};

export const authenticatedFetch = async <T = any>(
	url: string,
	options?: FetchOptions
): Promise<T> => {
	const makeRequest = async (): Promise<T> => {
		return await $fetch<T>(url, {
			...options,
			credentials: "include"
		});
	};

	try {
		return await makeRequest();
	} catch (error: any) {
		const isUnauthorized = 
			error?.statusCode === 401 || 
			error?.status === 401 ||
			(error?.response?.status === 401) ||
			(error?.message?.includes("401") && error?.message?.includes("Unauthorized"));

		if (!isUnauthorized) {
			throw error;
		}

		if (isReauthenticating) {
			return new Promise<T>((resolve, reject) => {
				reauthQueue.push(async () => {
					try {
						const result = await makeRequest();
						resolve(result);
					} catch (retryError) {
						reject(retryError);
					}
				});
			});
		}

		isReauthenticating = true;

		try {
			const authInit = useAuthInit();
			const authSuccess = await authInit.initialize();

			if (!authSuccess) {
				isReauthenticating = false;
				throw error;
			}

			isReauthenticating = false;

			await processReauthQueue();

			return await makeRequest();
		} catch (reauthError) {
			isReauthenticating = false;
			await processReauthQueue();
			throw reauthError;
		}
	}
};

export const isExternalServer = () => {
	return process.env.EXTERNAL_SERVER === "true"
		|| process.env.EXTERNAL_SERVER === "1"
		|| useRuntimeConfig().public.externalServer;
};