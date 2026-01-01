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
		"@nuxt/image"
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
		}
	},

	runtimeConfig: {
		cookieKey: process.env.NUXT_COOKIE_KEY || ""
	}
});