<template>
	<div class="settings-endpoints-table-wrap">
		<template
			v-for="(group, categoryKey) in endpointGroups"
			:key="categoryKey"
		>
			<table
				v-if="Object.keys(group).length > 0"
				class="settings-endpoints-table"
			>
				<thead>
					<tr>
						<th>{{ getString(categoryKey) }}</th>
						<th>URL</th>
						<th>{{ getString("settings.server.response") }}</th>
					</tr>
				</thead>

				<tbody>
					<tr
						v-for="(item, key) in group"
						:key="key"
					>
						<td>{{ getString(item.labelKey) }}</td>
						<td>{{ item.method === "GET" ? "GET " : "" }}{{ item.path }}</td>
						<td class="settings-endpoint-response">
							<template v-if="endpointResults[key]?.status === 'checking'">
								{{ getString("settings.server.resultChecking") }}
							</template>
							<ClientOnly v-else>
								<JsonViewer
									:value="endpointResults[key]?.data"
									:theme="'dark'"
									copyable
									boxed
									sort
									class="settings-json-viewer"
								/>
								<template #fallback>{{ getString("settings.server.resultChecking") }}</template>
							</ClientOnly>
						</td>
					</tr>
				</tbody>
			</table>
		</template>
	</div>
</template>

<script setup lang="ts">
import { JsonViewer } from "vue3-json-viewer";

import "vue3-json-viewer/dist/vue3-json-viewer.css";

export type EndpointResult = { status: "ok" | "error" | "checking"; data?: unknown };

export type ServerEndpointItem = { method: "GET" | "WS"; path: string; labelKey: string };

const props = defineProps<{
	endpoints: Record<string, ServerEndpointItem>;
}>();

const { getString } = useStrings();

const defaultResult = (): EndpointResult => ({ status: "checking" });

const endpointResults = ref<Record<string, EndpointResult>>({});

const endpointGroups = computed(() => {
	const http: Record<string, ServerEndpointItem> = {};
	const ws: Record<string, ServerEndpointItem> = {};

	for (const [key, item] of Object.entries(props.endpoints)) {
		if (item.method === "GET") {
			http[key] = item;
		}

		else {
			ws[key] = item;
		}
	}

	return {
		"settings.server.categoryHttp": http,
		"settings.server.categoryWebSocket": ws
	};
});

function checkEndpoints() {
	if (!import.meta.client) return;

	for (const key of Object.keys(props.endpoints)) {
		endpointResults.value[key] = defaultResult();
	}

	const wsBase = (typeof location !== "undefined" && location.origin) ? location.origin.replace(/^http/, "ws") : "ws://127.0.0.1:3000";

	for (const [key, item] of Object.entries(props.endpoints)) {
		if (item.method === "GET") {
			$fetch(item.path).then((data) => {
				endpointResults.value[key] = { status: "ok", data };
			}).catch((error: { data?: unknown; statusMessage?: string; message?: string }) => {
				endpointResults.value[key] = {
					status: "error",
					data: error?.data ?? { error: error?.statusMessage ?? error?.message ?? "Error" }
				};
			});
		}

		else {
			const ws = new WebSocket(wsBase + item.path);

			ws.onmessage = (event) => {
				let data: unknown;
				try {
					data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
				} catch {
					data = { raw: String(event.data) };
				}
				endpointResults.value[key] = { status: "ok", data };
				ws.close();
			};

			ws.onclose = (event) => {
				const current = endpointResults.value[key];
				if (current?.status === "checking") {
					endpointResults.value[key] = {
						status: "error",
						data: event.code === 4001
							? { error: getString("settings.server.resultAuthRequired") }
							: { error: "Connection closed", code: event.code }
					};
				}
			};

			ws.onerror = () => {
				const current = endpointResults.value[key];
				if (current?.status === "checking") {
					endpointResults.value[key] = { status: "error", data: { error: "Connection error" } };
				}
			};
		}
	}
}

watch(() => props.endpoints, checkEndpoints, { immediate: false });

onMounted(checkEndpoints);

defineExpose({ checkEndpoints });
</script>

<style scoped lang="scss">
.settings-endpoints-table-wrap {
	display: flex;
	flex-direction: column;
	gap: 16px;
	overflow-x: auto;
}

.settings-endpoints-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 13px;

	th, td {
		padding: 8px 12px;
		text-align: left;
		border: 1px solid var(--border, #3a3a3a);
	}

	th {
		background: var(--bg-tertiary, #2a2a2a);
		color: var(--text, #fff);
		font-weight: 600;
	}

	td {
		color: var(--text-secondary, #b3b3b3);
	}
}

.settings-endpoint-response {
	max-width: 320px;
	vertical-align: top;
}

.settings-json-viewer {
	font-size: 12px;
	line-height: 1.4;

	:deep(.jv-code) {
		padding: 6px 8px;
	}
}
</style>
