<script setup lang="ts">
import { useVkStore } from "~/stores/vk";

const route = useRoute();
const vkStore = useVkStore();

const ownerId = computed(() => {
	const ownerIdParam = route.query.owner_id as string;
	return ownerIdParam ? Number(ownerIdParam) : vkStore.user_id || 0;
});

const link = computed(() => route.query.link as string);

if (link.value) {
	const playlistsData = await $fetch<any[]>(`/api/vk/artists/collections`, {
		params: {
			link: link.value
		}
	}).catch(() => {
		return null;
	});

	if (playlistsData && playlistsData.length > 0) {
		const firstPlaylist = playlistsData[0];
		await navigateTo(`/playlist/${firstPlaylist.owner_id}/${firstPlaylist.playlist_id}`);
	}
} else {
	await navigateTo(`/playlist/${ownerId.value}/-1`);
}
</script>
