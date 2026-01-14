// https://nuxt.com/docs/api/configuration/nuxt-config
const isTauri = process.env.TAURI_PLATFORM !== undefined
	|| process.env.TAURI_FAMILY !== undefined
	|| process.env.TAURI !== undefined;

export default defineNuxtConfig({
	ssr: true,
	compatibilityDate: "2025-07-15",
	devtools: { enabled: true },

	modules: [
		"@pinia/nuxt",
		"pinia-plugin-persistedstate/nuxt",
		"@nuxt/icon",
		"nuxt-auth-utils",
		"@nuxt/image",
		"@nuxt/fonts",
		...(isTauri ? [] : ["@vite-pwa/nuxt"])
	],

	routeRules: {
		// Статические страницы
		"/": { ssr: false },
		"/auth": { ssr: false },
		"/settings": { ssr: false },

		// SWR для страниц с данными, требующих аутентификации
		"/general": { swr: true },
		"/artists": { swr: true },
		"/collection": { swr: true },
		"/discover/**": { swr: true },

		// SWR для динамических страниц
		"/playlist/**": { swr: true },
		"/artist/**": { swr: true },
		"/search/**": { ssr: false },
		"/songs/**": { ssr: false }
	},

	image: {
		// Ограничиваем кэширование изображений в Tauri для экономии памяти
		...(isTauri ? {
			provider: "ipx",
			ipx: {
				maxAge: 60 * 60 * 24 * 7 // 7 дней вместо бесконечного кэша
			}
		} : {
			providers: {
				ipx: {}
			},

			format: ["webp", "avif"],
			quality: 80,

			screens: {
				xs: 320,
				sm: 640,
				md: 768,
				lg: 1024,
				xl: 1280,
				xxl: 1536
			}
		})
	},

	css: ["~/assets/css/variables.scss"],

	fonts: {
		provider: "google",
		families: [
			{
				name: "Inter",
				weights: [400, 500, 600, 700],
				subsets: ["latin", "cyrillic"]
			}
		],

		defaults: {
			weights: [400, 500, 600, 700],
			styles: ["normal"],
			subsets: ["latin", "cyrillic"]
		},

		experimental: {
			processCSSVariables: true
		}
	},

	experimental: {
		payloadExtraction: true,
		viewTransition: true
	},

	nitro: {
		compressPublicAssets: true,

		prerender: {
			crawlLinks: false,

			ignore: [
				"/general",
				"/artists",
				"/collection",
				"/discover",
				"/discover/**"
			]
		}
	},

	vite: {
		optimizeDeps: {
			exclude: ["cssstyle", "jsdom"]
		},

		ssr: {
			noExternal: [],
			resolve: {
				conditions: ["node"]
			}
		},

		build: {
			chunkSizeWarningLimit: 650,

			commonjsOptions: {
				transformMixedEsModules: true,
				exclude: [/cssstyle/, /jsdom/]
			}
		},

		esbuild: {
			charset: "utf8"
		},

		server: {
			hmr: {
				port: 24679
			}
		}
	},

	devServer: {
		host: "0.0.0.0"
	},

	runtimeConfig: {
		cookieKey: (process.env.NUXT_COOKIE_KEY || "").replace(/\\n/g, "\n"),

		session: {
			password: process.env.NUXT_SESSION_PASSWORD || "",

			cookie: {
				secure: false,
				sameSite: "lax"
			}
		},

		discordClientSecret: process.env.DISCORD_CLIENT_SECRET || "",

		public: {
			repository: process.env.REPOSITORY || "",
			
			externalServer: process.env.EXTERNAL_SERVER === "true"
				|| process.env.EXTERNAL_SERVER === "1",

			discordClientId: process.env.DISCORD_CLIENT_ID || ""
		}
	}
});