export default {
	registerType: "autoUpdate",
	manifest: {
		name: "Meridius Nova",
		short_name: "Meridius",
		description: "Music player application",
		start_url: "/",
		scope: "/",
		display: "standalone",
		background_color: "#121212",
		theme_color: "#e9003f",
		icons: [
			{
				src: "/icons/192x192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "any maskable"
			},
			{
				src: "/icons/512x512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "any maskable"
			},
			{
				src: "/icons/1024x1024.png",
				sizes: "1024x1024",
				type: "image/png",
				purpose: "any maskable"
			}
		],
		categories: ["music", "entertainment"],
		prefer_related_applications: false,
		lang: "ru",
		dir: "ltr",
		orientation: "any",
		display_override: ["standalone", "minimal-ui"]
	},
	workbox: {
		enabled: true,
		globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2,woff,ttf}"],
		navigateFallback: "/",
		navigateFallbackDenylist: [/^\/api\//, /^\/_/]
	},
	devOptions: {
		enabled: true,
		type: "module"
	},
	client: {
		installPrompt: true
	}
}