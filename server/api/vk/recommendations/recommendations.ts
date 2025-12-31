import { BaseRequest } from "~~/server/utils/base";
import { getArtistsRequestsInstance } from "../artists/artists";

import type { EventHandlerRequest, H3Event } from "h3";
import type { TRecommendationsOnboarding, TMore } from "~~/server/utils/types";
import { IRequest, TRawResponse } from "~~/server/utils/types";

class RecommendationsRequests extends BaseRequest implements IRequest {
	constructor(event: H3Event<EventHandlerRequest>) {
		super(event);
	}

	public async builder<T, K>(response: TRawResponse<T>): Promise<K[]> {
		return [] as K[];
	}

	public async onboarding(params: { more?: TMore } = {}): Promise<TRecommendationsOnboarding> {
		const response = await this.request<TRawResponse<any>>({
			act: "get_recoms_onboarding",
			al: 1,
			...(params.more
				? { start_from: params.more.next_from }
				: { load_script: 0 })
		});

		const artistsRequests = getArtistsRequestsInstance(this.event);
		const payload = artistsRequests["payload"](response);

		return {
			artists: payload?.artists || [],
			relatedCount: payload?.relatedCount || 5,
			hash: payload.hash || "",
			next: payload.more
				? () => this.onboarding({
					...params,
					more: payload.more
				})
				: undefined
		};
	}

	public async configure(artists: number[], params: { hash: string }): Promise<any> {
		if (!artists || !Array.isArray(artists) || artists.length < 5) {
			throw createError({
				statusCode: 400,
				message: "You must to pick five or more artists ids"
			});
		}

		if (!params.hash) {
			throw createError({
				statusCode: 400,
				message: "You must to pass hash fetched from recommendations.onboarding()"
			});
		}

		const artistsParams: Record<string, string> = {};

		for (let i = 0; i < artists.length; i++) {
			artistsParams[`artists[${i}]`] = String(artists[i]);
		}

		return await this.request({
			act: "finish_recoms_onboarding",
			al: 1,
			hash: params.hash,
			...artistsParams
		});
	}
}

let recommendationsRequests: RecommendationsRequests | null = null;

export const getRecommendationsRequestsInstance = (event: H3Event<EventHandlerRequest>): RecommendationsRequests => {
	if (!recommendationsRequests) {
		recommendationsRequests = new RecommendationsRequests(event);
		return recommendationsRequests;
	}

	recommendationsRequests.http.event = event;
	return recommendationsRequests;
};
