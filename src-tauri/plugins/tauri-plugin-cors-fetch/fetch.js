class CORSFetch {
	requestId = 1;

	constructor() {
		window.fetchCORS = (input, init) => this.fetchCORS(input, init, true);
	}

	async fetchCORS(input, init) {
		this.requestId++;

		let headers = [];

		if (init.headers) {
			if (init.headers instanceof Headers) {
				headers = Array.from(init.headers.entries());
			} else if (Array.isArray(init.headers)) {
				headers = init.headers;
			} else {
				headers = Object.entries(init.headers);
			}
		}

		const request = new Request(input, init);
		const buffer = await request.arrayBuffer();

		const data = buffer.byteLength
			? Array.from(new Uint8Array(buffer))
			: null;

		const {
			status,
			statusText,
			url,
			body,
			headers: responseHeaders,
		} = await window.__TAURI_INTERNALS__.invoke("plugin:cors-fetch|cors_request", {
			request: {
				requestId: this.requestId,
				method: request.method,
				url: request.url,
				headers,
				data,
				maxRedirections: 0
			}
		});

		const bodyBytes = body ? Uint8Array.from(atob(body), c => c.charCodeAt(0)) : null;

		const response = new Response(bodyBytes, {
			headers: new Headers(responseHeaders),
			status,
			statusText
		});

		Object.defineProperty(response, "url", { value: url });
		return response;
	}
}

(() => {
	if ("__TAURI__" in window) {
		window.CORSFetch = new CORSFetch();
	}
})();