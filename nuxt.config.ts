// https://nuxt.com/docs/api/configuration/nuxt-config
const isTauri = process.env.TAURI_PLATFORM !== undefined || process.env.TAURI_FAMILY !== undefined || process.env.TAURI !== undefined;

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
		...(isTauri ? [] : ["@vite-pwa/nuxt"])
	],
	
	image: {
		// Ограничиваем кэширование изображений в Tauri для экономии памяти
		...(isTauri ? {
			provider: "ipx",
			ipx: {
				maxAge: 60 * 60 * 24 * 7 // 7 дней вместо бесконечного кэша
			}
		} : {})
	},
	css: ["~/assets/css/variables.scss"],

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
		cookieKey: process.env.NUXT_COOKIE_KEY || "",

		session: {
			password: process.env.NUXT_SESSION_PASSWORD || "",

			cookie: {
				secure: false,
				sameSite: "lax"
			}
		},

		public: {
			externalServer: process.env.EXTERNAL_SERVER === "true"
				|| process.env.EXTERNAL_SERVER === "1"
		}
	}
});
