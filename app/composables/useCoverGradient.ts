import { ref, watch, type Ref } from "vue";

const SIZE = 64;
const DEFAULT_GRADIENT =
	"linear-gradient(155deg, rgb(22, 18, 28) 0%, rgb(14, 20, 26) 45%, rgb(18, 14, 24) 100%)";

type Rgb = { r: number; g: number; b: number };

const rgbToHsl = (red: number, green: number, blue: number): { h: number; s: number; l: number } => {
	const r = red / 255;
	const g = green / 255;
	const b = blue / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
				break;
			case g:
				h = ((b - r) / d + 2) / 6;
				break;
			default:
				h = ((r - g) / d + 4) / 6;
		}
	}

	return { h: h * 360, s: s * 100, l: l * 100 };
};

const hueToChannel = (p: number, q: number, t: number): number => {
	const tNorm = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
	if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
	if (tNorm < 1 / 2) return q;
	if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
	return p;
};

const hslToRgb = (hue: number, sat: number, light: number): Rgb => {
	const h = hue / 360;
	const s = sat / 100;
	const l = light / 100;
	let r: number;
	let g: number;
	let b: number;

	if (s === 0) {
		r = g = b = l;
	} else {
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hueToChannel(p, q, h + 1 / 3);
		g = hueToChannel(p, q, h);
		b = hueToChannel(p, q, h - 1 / 3);
	}

	return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

const getSaturation = (red: number, green: number, blue: number): number => {
	const r = red / 255;
	const g = green / 255;
	const b = blue / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);

	if (max === min) return 0;

	const l = (max + min) / 2;
	const d = max - min;
	return (l > 0.5 ? d / (2 - max - min) : d / (max + min)) * 100;
};

const darkenForBackground = (red: number, green: number, blue: number): Rgb => {
	const { h, s, l } = rgbToHsl(red, green, blue);
	const darkL = 26 + (l / 100) * 14;
	const darkS = Math.min(100, s * 0.8);
	return hslToRgb(h, darkS, darkL);
};

const avg = (arr: Rgb[]): Rgb => {
	const sum = arr.reduce(
		(acc, item) => ({ r: acc.r + item.r, g: acc.g + item.g, b: acc.b + item.b }),
		{ r: 0, g: 0, b: 0 }
	);

	return arr.length > 0
		? { r: sum.r / arr.length, g: sum.g / arr.length, b: sum.b / arr.length }
		: { r: 0, g: 0, b: 0 };
};

const luminance = (p: Rgb): number => (0.299 * p.r + 0.587 * p.g + 0.114 * p.b) / 255;

const extractPixels = (imageUrl: string): Promise<Rgb[]> =>
	new Promise((resolve) => {
		const image = new Image();
		image.crossOrigin = "anonymous";
		image.onerror = () => resolve([]);

		image.onload = () => {
			const canvas = document.createElement("canvas");
			
			canvas.width = SIZE;
			canvas.height = SIZE;

			const ctx = canvas.getContext("2d");

			if (!ctx) {
				return resolve([]);
			}

			ctx.drawImage(image, 0, 0, SIZE, SIZE);
			const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
			const pixels: Rgb[] = [];

			for (let i = 0; i < data.length; i += 4) {
				const r = data[i] ?? 0;
				const g = data[i + 1] ?? 0;
				const b = data[i + 2] ?? 0;

				if (luminance({ r, g, b }) < 0.95) {
					pixels.push({ r, g, b });
				}
			}

			return resolve(pixels);
		};

		image.src = imageUrl;
	});

const buildGradientFromPixels = (pixels: Rgb[]): string => {
	if (pixels.length < 2) {
		return DEFAULT_GRADIENT;
	}

	const saturated = pixels.filter((p) => getSaturation(p.r, p.g, p.b) > 18);
	const source = saturated.length >= 2 ? saturated : pixels;
	const sorted = [...source].sort((a, b) => luminance(a) - luminance(b));
	const low = sorted.slice(0, Math.ceil(sorted.length * 0.4));
	const high = sorted.slice(Math.floor(sorted.length * 0.6));

	if (low.length === 0 || high.length === 0) {
		return DEFAULT_GRADIENT;
	}

	const lowAvg = avg(low);
	const highAvg = avg(high);
	const c1 = darkenForBackground(lowAvg.r, lowAvg.g, lowAvg.b);
	const c2 = darkenForBackground(highAvg.r, highAvg.g, highAvg.b);

	return `linear-gradient(160deg, rgb(${Math.round(c1.r)},${Math.round(c1.g)},${Math.round(c1.b)}) 0%, rgb(${Math.round(c2.r)},${Math.round(c2.g)},${Math.round(c2.b)}) 50%, rgb(${Math.round(c1.r)},${Math.round(c1.g)},${Math.round(c1.b)}) 100%)`;
};

export const useCoverGradient = (coverUrl: Ref<string>) => {
	const gradient = ref(DEFAULT_GRADIENT);

	watch(coverUrl, async (url) => {
		if (!url || url === "/no-cover.webp") {
			gradient.value = DEFAULT_GRADIENT;
			return;
		}

		const pixels = await extractPixels(url);
		gradient.value = buildGradientFromPixels(pixels);
	}, { immediate: true });

	return { gradient };
};