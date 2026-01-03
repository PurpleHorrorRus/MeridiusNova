// https://nuxt.com/docs/api/configuration/nuxt-config
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
		"@vite-pwa/nuxt"
	],
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
		}
	}
});
