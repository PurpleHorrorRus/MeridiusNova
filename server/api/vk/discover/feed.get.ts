import { BaseRequest } from "~~/server/utils/base";
import { getAudioRequestsInstance } from "../audio/audio";
import { getPlaylistsRequestsInstance } from "../playlists/playlists";

import type { TAudio } from "../audio/types";

type TFeedPost = {
	post_id: number;
	type: "audio" | "audio_playlist";
	profile: {
		id: number;
		name: string;
		photo: string;
	};
	time: number;
	likes?: {
		count: number;
	};
	reposts?: {
		count: number;
	};
	text: string;
	audios?: TAudio[];
	playlist?: {
		raw_id: string;
		owner_id: number;
		playlist_id: number;
		title: string;
		cover: string;
		list: TAudio[];
	};
};

export default defineEventHandler(async (event) => {
	const baseRequest = new BaseRequest(event);
	const audioRequests = getAudioRequestsInstance(event);
	const playlistsRequests = getPlaylistsRequestsInstance(event);
	const query = getQuery(event);

	const startFrom = query.start_from as string || "";
	const count = query.count ? Number(query.count) : 100;

	const response = await baseRequest.callVKAPI("newsfeed.get", {
		filters: "post",
		start_from: startFrom,
		count: count.toString()
	});

	const posts = (response.items || []).filter((post: any) => {
		return post.attachments?.some((attachment: any) => {
			return attachment.type === "audio" || attachment.type === "audio_playlist";
		});
	});

	const profiles = response.profiles || [];
	const groups = response.groups || [];

	const processedPosts: TFeedPost[] = [];

	for (let i = 0; i < posts.length; i++) {
		const post = posts[i];
		const audioAttachments = post.attachments.filter((attachment: any) => {
			return attachment.type === "audio" || attachment.type === "audio_playlist";
		});

		for (const attachment of audioAttachments.slice(0, 1)) {
			let profile: { id: number; name: string; photo: string };

			if (post.source_id >= 0) {
				const user = profiles.find((u: any) => u.id === post.source_id);
				profile = {
					id: user.id,
					name: `${user.first_name} ${user.last_name}`,
					photo: user.photo_200 || user.photo_100 || ""
				};
			} else {
				const sourceId = Math.abs(post.source_id);
				const group = groups.find((g: any) => g.id === sourceId);
				profile = {
					id: post.source_id,
					name: group.name,
					photo: group.photo_200 || group.photo_100 || ""
				};
			}

			if (attachment.type === "audio") {
				const audios = await audioRequests.getFromWall({
					owner_id: post.source_id,
					post_id: post.post_id,
					raw: false
				});

				processedPosts.push({
					post_id: post.post_id,
					type: "audio",
					profile,
					time: post.date,
					likes: post.likes,
					reposts: post.reposts,
					text: post.text || "",
					audios
				});
			} else if (attachment.type === "audio_playlist") {
				const playlist = await playlistsRequests.getById({
					access_hash: attachment.audio_playlist.access_key || "",
					owner_id: attachment.audio_playlist.owner_id,
					playlist_id: attachment.audio_playlist.id,
					count: 10,
					list: true
				});

				processedPosts.push({
					post_id: post.post_id,
					type: "audio_playlist",
					profile,
					time: post.date,
					likes: post.likes,
					reposts: post.reposts,
					text: post.text || "",
					playlist: playlist ? {
						raw_id: playlist.raw_id || "",
						owner_id: playlist.owner_id || 0,
						playlist_id: playlist.playlist_id || 0,
						title: playlist.title || "",
						cover: playlist.cover_url || "",
						list: playlist.list || []
					} : undefined
				});
			}
		}

		if (i < posts.length - 1) {
			await new Promise(resolve => setTimeout(resolve, 150));
		}
	}

	return {
		posts: processedPosts,
		next_from: response.next_from || ""
	};
});

