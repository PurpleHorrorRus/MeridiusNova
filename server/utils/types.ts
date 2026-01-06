import type { TRawAudio } from "../api/vk/audio/types";

export type TFetchCorsRequestInit = RequestInit;
export type TFetchCorsResponse = Response & { headers: Record<string, string> };

declare global {
	interface Window {
		fetchCORS: (input: string | URL, init?: TFetchCorsRequestInit) => Promise<TFetchCorsResponse>;
	}
}

export enum ERequestMethod {
	GET = "GET",
	POST = "POST"
};

export interface IRequest {
	builder: <T, K>(response: TRawResponse<T>) => Promise<K[]>;
};

export type TQrResponse = {
	url: string;
	expires_in: number;
};

export type TCheckResponse = {
	type: "okay" | "error";

	data: {
		response_type: "auth_token";

		auth_info: {
			type: "silent_token";
			auth: 1,

			user: {
				id: number;
				first_name: string;
				last_name: string;
				avatar: string;
				avatar_base: null;
				phone: string;
			};

			token: string;
			ttl: number;
			uuid: string;
			hash: string;
		};

		access_token: string;
		ext_id: string;
		next_step_url: string;
	}
};

export type TMore = Partial<{
	section_id: string;
	next_from: string;
	start_from: string;
}>;

export type TRawPlaylist = {
	accessHash: string;
	addClasses: string;
	authorHref: string;
	authorName: string;
	blockId: string;
	coverUrl: string;
	description: string;
	editHash: string;
	expire: number | null;
	followHash: string;
	gridCovers: string;
	hasMore: boolean;
	id: string;
	infoLine1: string;
	infoLine2: string;
	isBlocked: boolean;
	isFollowed: boolean;
	isOfficial: number;
	is_exclusive: null;
	is_explicit: null;
	is_generated_playlist: null;
	lastUpdated: 0;
	list: TRawAudio[];
	listens: number;
	nextOffset: string;
	noDiscover: boolean;
	no_dicscover_amt: null;
	ownerId: number;
	permissions: [];
	rawDescription: string;
	subTitle: string;
	title: string;
	titleLang: number;
	totalCount: number;
	totalCountHash: string;
	type: "playlist";
};

export type TRawResponse<T> = {
	langKeys: {
		global: [];
		local: Record<string, string>;
	};
	langVersion: string;
	loaderVersion: string;
	pageviewCandidate: boolean;
	payload: TPayload<T>;
	static: string;

	statsMeta: {
		hash: string;
		id: number;
		platform: string;
		reloadVersion: number;
		st: true;
		time: number;
	};

	templates: {
		audio_bits_to_cls: string;
		_: string;
	};
};

export type TPayload<T> = {
	0: 0;
	1: T;
};

export type TGetSectionPayload = {
	0: string;

	1: {
		blockIds: string[];
		hints: [];
		nextFrom: string;
		next_from: string;
		playlist: TRawPlaylist;
		playlistData?: {
			list: TRawAudio[];
		};
		playlists: TRawPlaylist[];
		qid: string;
		searchParams: { globalQuery: string; };
		search_query: string;
		sectionId: string;
		title: string;
	};
};

export type TGetGeneralSectionPayload = [string, {
	playlist: TRawPlaylist;
}];

export type TGetCatalogSectionPayload = [string, {
	playlist: TRawPlaylist;
	playlists: TRawPlaylist[];
	next_from: string;
	nextFrom: string;
	search_qurery: string;
	hints: [];
	searchParams: [];
	title: string;
	sectionId: string;
	blockIds: string[];
	isBlockPagination: boolean;
	qid: null;
}];

export type THintsPayload = TPayload<[Array<[unknown, string, unknown, string]>]>;

export type TAuthSession = {
	qr: {
		auth_hash: string;
		expires_in: number;
	};

	init: {
		auth: {
			v: string;
			host_app_id: string;
			anonymous_token: string;
		};
	};
};

export type TArtist = {
	id: string;
	name: string;
	cover: string;
	link: string;
};

export type TPlaylistAuthor = {
	id: number | string;
	name: string;
};

export type TPlaylist = {
	owner_id: number;
	playlist_id: number;
	raw_id: string;
	title: string;
	cover_url: string;
	description: string;
	raw_description?: string;
	size: number;
	listens: number;
	last_updated: number;
	explicit: boolean;
	followed: boolean;
	official: boolean;
	restricted: boolean;
	access_hash: string;
	follow_hash: string;
	edit_hash: string;
	context?: string;
	author?: TPlaylistAuthor;
	covers?: string[];
	artists?: Array<{
		name: string;
		link: string;
	}>;
	year?: number;
	subtitle?: string;
	list?: TAudio[];
	more?: TMore | null;
	link?: string;
	original?: {
		playlist_id: number;
		owner_id: number;
		access_key: string;
	};
};

import type { TAudio as TAudioFromAudio } from "../api/vk/audio/types";

export type TAudio = TAudioFromAudio;

export type TSearchCategory = {
	id: string;
	title: string;
	type: "owned_audios" | "global_audios" | "albums" | "artists" | "playlists" | "text_found";
	sectionId?: string;
	link?: string;
	audios?: TAudio[];
	playlists?: TPlaylist[];
	artists?: TArtist[];
	more?: TMore | null;
	next?: () => Promise<TSearchCategory>;
};

export type TSearchResult = {
	audios: TAudio[];
	playlists: TPlaylist[];
	artists: TArtist[];
	more: TMore | null;
	collections?: TPlaylistCollection[];
	categories?: TSearchCategory[];
	next?: () => Promise<TSearchResult>;
};

export type TPlaylistCollection = {
	type: string;
	title: string;
	playlists: TPlaylist[];
	link?: string;
	params?: URLSearchParams | Record<string, string> | string;
	more?: TMore;
};

export type TRecommendationsOnboarding = {
	artists: TArtist[];
	relatedCount: number;
	hash: string;
	next?: () => Promise<TRecommendationsOnboarding>;
};

export type TExploreData = {
	albums: TAlbum[];
	artists: TAudio[];
	releases: TAudio[];
	chart: TAudio[];
	playlists: TPlaylistCollection[];
};

export type TAlbum = {
	title: string;
	text: string;
	subtext: string;
	image: string;
	type: "album" | "artist";
	owner_id?: number;
	playlist_id?: number;
	access_hash?: string;
	size?: number;
	artist?: string;
};

export type TRadio = {
	title: string;
	list: TRadioStation[];
	link?: string;
	params?: URLSearchParams;
	more?: TMore;
};

export type TRadioStation = {
	id: number;
	title: string;
	cover: string;
	fave: boolean;
	faveHash: string;
};

export type TRadioStationRaw = [
	number, // id
	number, // owner_id
	string, // url
	string, // title
	unknown, // unknown
	unknown, // unknown
	unknown, // unknown
	unknown, // unknown
	unknown, // unknown
	unknown, // unknown
	unknown, // unknown
	unknown, // unknown
	{ fave?: boolean; faveHash?: string; } | unknown, // fave info
	unknown, // unknown
	string, // icon
	unknown // unknown
];

export type TVkMixResponse = {
	song: TAudio;
	sectionId: string;
};

export type TExploreSection = [string, {
	sectionId?: string;
	section_id?: string;
	next_from?: string;
	nextFrom?: string;
	playlists?: TRawPlaylist[];
	playlist?: TRawPlaylist;
	[key: string]: unknown;
}];

export type TAlbumRawItem = {
	title: string;
	text: string;
	subtext: string;
	image: string;
	type: "album" | "artist";
	owner_id?: number;
	playlist_id?: number;
	access_hash?: string;
	size?: number;
	artist?: string;
};

export type TAccount = {
	id: number;
	name: string;
	avatar?: string;
	[key: string]: unknown;
};

export type TFavUser = {
	id: number;
	name: string;
	[key: string]: unknown;
};

export type TFavGroup = {
	id: number;
	name: string;
	[key: string]: unknown;
};

export type TFavArtist = {
	id: string;
	name: string;
	[key: string]: unknown;
};

export type TTabHistoryItem = {
	path: string;
	title: string;
	[key: string]: unknown;
};

export type TLyrics = {
	credits?: string;
	lyrics?: {
		timestamps?: Array<{
			line: string;
			begin: number;
			end: number;
		}>;
		text?: string[];
		ugc?: string[];
	};
};

export type TPlayerState = {
	song: TAudio | null;
	paused: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	playbackRate: number;
	loading: boolean;
	error: string | null;
};

export type TSettings = {
	window: {
		display: number;
		width: number;
		height: number;
		x: number;
		y: number;
		fullscreen: boolean;
		multithreading: boolean;
		hardwareAcceleration: boolean;
		startup: boolean;
		hideOnClose: boolean;
		devtools: boolean;
	};
	general: {
		lang: string;
		logging: boolean;
		beta: boolean;
		updateChannel: "production" | "beta" | "development";
		discord: {
			enable: boolean;
			timeline: boolean;
			reverse: boolean;
		};
		streamer: {
			enable: boolean;
			path: string;
		};
		proxy: {
			enable: boolean;
			url: string;
		};
		server: {
			enable: boolean;
			url: string;
			port: number;
		};
	};
	player: {
		output: string;
		volume: number;
		random: boolean;
		repeat: boolean;
		playbackRate: number;
		mute: boolean;
		broadcast: boolean;
		volumeDivider: number;
		rewind: boolean;
		timeMode: number;
		latest: {
			save: boolean;
			exit: boolean;
			play: boolean;
		};
		miniwindow: {
			enable: boolean;
			minimode: boolean;
			x: number;
			y: number;
		};
		normalizer: {
			enable: boolean;
			max: number;
		};
		crossfade: {
			enable: boolean;
			duration: number;
			fade: boolean;
		};
		step: {
			wheel: number;
			hotkey: number;
		};
		playbackRateStep: {
			click: number;
			wheel: number;
			hotkey: number;
		};
	};
	download: {
		enable: boolean;
		path: string;
		template: string;
	};
	appearance: {
		layout: number;
		expand: boolean;
		leftMenuWidth: number;
		rightMenuWidth: number;
		queueHeight: number;
		roundedTop: boolean;
		roundedBottom: boolean;
		hideTitlebarButtons: boolean;
		fullFrame: boolean;
		tabs: boolean;
		customTheme: boolean;
		theme: string;
		acryl: {
			enable: boolean;
			material: string;
			opacity: number;
		};
		sidebarPlaylistsExpanded: boolean;
		sidebarLibraryExpanded: boolean;
	};
	optimization: {
		fetchRestriction: number;
		stashSize: number;
		download: {
			auto: boolean;
			fixed: number;
		};
	};
	equalizer: {
		enable: boolean;
		levels: number[];
		spectrumVisualization: boolean;
	};
	cache: {
		enable: boolean;
		path: string;
		maxSize: number;
	};
	vk: {
		active: number;
		accounts: TAccount[];
	};
	favs: {
		users: TFavUser[];
		groups: TFavGroup[];
		artists: TFavArtist[];
	};
	hotkeys: Record<string, string>;
	latest: {
		song: TAudio | null;
		playlist: TPlaylist | null;
	};
	tabs: {
		active: number;
		list: Array<{
			page: number;
			title: string;
			icon: string;
			history: TTabHistoryItem[];
		}>;
	};
	settingHints: {
		ru: {
			general: {
				hardwareAcceleration?: string;
				beta?: string;
				streamer?: string;
				proxy?: {
					url?: string;
				};
			};
			appearance: {
				windowControlButtons?: string;
				fullFrame?: string;
				acrylic?: string;
				zoom?: string | string[];
				themes?: {
					download?: string;
				};
			};
			player: {
				volumeDivider?: string;
				miniwindow?: {
					minimode?: string;
				};
				rewind?: string;
				normalizer?: {
					tip?: string;
					max?: string;
				};
			};
			optimization: {
				multithreading?: string;
				hardwareAcceleration?: string;
				stashSize?: string;
				loadingRestriction?: string;
				download?: {
					auto?: string;
					fixed?: string;
				};
			};
			downloads: {
				ffmpeg?: string;
				template?: string;
			};
			server: {
				password?: string;
			};
		};
		en: {
			general: {
				hardwareAcceleration?: string;
				beta?: string;
				streamer?: string;
				proxy?: {
					url?: string;
				};
			};
			appearance: {
				windowControlButtons?: string;
				fullFrame?: string;
				acrylic?: string;
				zoom?: string | string[];
				themes?: {
					download?: string;
				};
			};
			player: {
				volumeDivider?: string;
				miniwindow?: {
					minimode?: string;
				};
				rewind?: string;
				normalizer?: {
					tip?: string;
					max?: string;
				};
			};
			optimization: {
				multithreading?: string;
				hardwareAcceleration?: string;
				stashSize?: string;
				loadingRestriction?: string;
				download?: {
					auto?: string;
					fixed?: string;
				};
			};
			downloads: {
				ffmpeg?: string;
				template?: string;
			};
			server: {
				password?: string;
			};
		};
	};
};