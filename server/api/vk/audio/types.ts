export enum ERawAudio {
	ID = 0,
	OWNER_ID = 1,
	URL = 2,
	TITLE = 3,
	PERFORMER = 4,
	DURATION = 5,
	ALBUM_ID = 6,
	UNKNOWN_7 = 7,
	AUTHOR_LINK = 8,
	LYRICS = 9,
	FLAGS = 10,
	CONTEXT = 11,
	EXTRA_JSON = 12,
	HASHES = 13,
	COVER_URL = 14,
	ADS = 15,
	SUBTITLE = 16,
	MAIN_ARTISTS = 17,
	FEAT_ARTISTS = 18,
	ALBUM = 19,
	TRACK_CODE = 20,
	RESTRICTION = 21,
	UNKNOWN_22 = 22,
	UNKNOWN_23 = 23,
	UNKNOWN_24 = 24,
	CHART = 25,
	UNKNOWN_26 = 26,
	UNKNOWN_27 = 27,
	UNKNOWN_28 = 28,
	UNKNOWN_29 = 29,
	UNKNOWN_30 = 30,
	UNKNOWN_31 = 31
};

export enum EAudioFlags {
	CAN_ADD_BIT = 2,
	CLAIMED_BIT = 4,
	HQ_BIT = 16,
	LONG_PERFORMER_BIT = 32,
	UMA_BIT = 128,
	REPLACEABLE = 512,
	EXPLICIT_BIT = 1024
};

export type TArtistRaw = 
	| { id: string; name: string; cover: string; link: string; }
	| [string, string, string, string]; // [id, name, cover, link]

export type TAlbumRaw = 
	| string
	| [number, number, string] // [owner_id, playlist_id, access_hash]
	| {
		owner_id?: number;
		ownerId?: number;
		id?: number;
		access_key?: string;
		accessKey?: string;
		access_hash?: string;
		accessHash?: string;
		title?: string;
		thumb?: {
			photo_300?: string;
			photo_600?: string;
			photo_1200?: string;
		};
	};

export type TChartRaw = unknown;

export type TRawAudio = [
	number, // ID
	number, // OWNER_ID
	string, // URL
	string, // TITLE
	string, // PERFORMER
	number, // DURATION
	number, // ALBUM_ID
	number, // UNKNOWN_7
	number, // AUTHOR_LINK
	number, // LYRICS
	number, // FLAGS
	string, // CONTEXT
	string, // EXTRA_JSON
	string, // HASHES
	string, // COVER_URL
	number, // ADS
	string, // SUBTITLE
	TArtistRaw[], // MAIN_ARTISTS
	TArtistRaw[], // FEAT_ARTISTS
	TAlbumRaw, // ALBUM
	string, // TRACK_CODE
	number, // RESTRICTION
	number, // UNKNOWN_22
	number, // UNKNOWN_23
	number, // UNKNOWN_24
	TChartRaw, // CHART
	number, // UNKNOWN_26
	number, // UNKNOWN_27
	number, // UNKNOWN_28
	number, // UNKNOWN_29
	number, // UNKNOWN_30
	number, // UNKNOWN_31
	number,
	unknown[]
];

export type TAudio = {
	id: number;
	owner_id: number;
	full_id: string;
	title: string;
	performer: string;
	artist?: string;
	duration: number;
	url: string;
	coverUrl_p?: string;
	coverUrl_s?: string;
	covers?: string;
	cover?: string;
	subtitle?: string;
	album_id?: number;
	album?: string | [number, number, string] | {
		owner_id: number;
		id: number;
		access_key?: string;
		access_hash?: string;
		title?: string;
		thumb?: {
			photo_300?: string;
			photo_600?: string;
			photo_1200?: string;
		};
	};
	lyrics?: boolean;
	hq?: boolean;
	claimed?: boolean;
	uma?: boolean;
	explicit?: boolean;
	is_restriction?: boolean;
	can_edit?: boolean;
	can_delete?: boolean;
	can_add?: boolean;
	replaceable?: boolean;
	context?: string;
	track_code?: string;
	ads?: number;
	add_hash?: string;
	edit_hash?: string;
	action_hash?: string;
	delete_hash?: string;
	replace_hash?: string;
	restore_hash?: string;
	artists?: Array<{
		id: string;
		name: string;
		cover: string;
		link: string;
	}>;
	feat?: Array<{
		id: string;
		name: string;
		cover: string;
		link: string;
	}>;
	chart?: TChartRaw;
	raw?: TRawAudio;
	addedSong?: TAudio; // Трек из библиотеки пользователя после добавления
};

export type TReloadAudiosPayload = [TRawAudio[] | "no_audios"];

export type TGetAudioParams = Partial<{
	raw: boolean;
	count: number;
	withUrls: boolean;
}>;

export type TParsedPayload = {
	audios: TAudio[];
	more: TMore;
};