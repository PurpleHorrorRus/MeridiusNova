export type TQrResponse = {
	url: string;
	expires_in: number;
};

export type TWebTokenParams = {
	version: number;
	app_id: number;
	access_token: string;
};

export type TWebTokenResponse = {
	type: "okay";

	data: {
		access_token: string;
		expires: number;
		logout_hash: string;
		user_id: number;
	};
};

export type TApiResponse<T> = {
	success: boolean;
	data: T;
};

export type TUserSession = {
    id: number;
};

export type TCookie = {
    access_token: string;
    user_id: number;
    iat: number;
    expires: number;
    sessionId: string;
    deviceFingerprint: string;
};