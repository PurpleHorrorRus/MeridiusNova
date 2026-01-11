<script setup>
import { useHead } from "#imports"

useHead({
  htmlAttrs: {
    lang: "ru"
  },
  title: "Meridius Nova",
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" },
    { name: "mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-status-bar-style", content: "black" },
    { name: "apple-mobile-web-app-title", content: "Meridius Nova" },
    { name: "theme-color", content: "#e9003f" },
    { name: "description", content: "Музыкальный плеер Meridius Nova" }
  ],
  link: [
    { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
    { rel: "manifest", href: "/manifest.json" },
    { rel: "apple-touch-icon", sizes: "192x192", href: "/icons/192x192.png" },
    { rel: "apple-touch-icon", sizes: "512x512", href: "/icons/512x512.png" },
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "anonymous" }
  ]
})
</script>
