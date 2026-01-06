import { isTauri } from "~/utils/tauri";
import type { TPlaylist } from "~~/server/utils/types";
import { TrayIcon } from "@tauri-apps/api/tray";
import { Menu, MenuItem, Submenu } from "@tauri-apps/api/menu";
import { resourceDir, join } from "@tauri-apps/api/path";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { useVkStore } from "~/stores/vk";
import { usePlaylistStore } from "~/stores/playlist";

let trayInstance: TrayIcon | null = null;
let playMenuItems: MenuItem[] = [];

export const useTray = () => {
	const createTray = async () => {
		if (!isTauri() || typeof window === "undefined") {
			return;
		}

		if (trayInstance) {
			return;
		}

		let iconPath: string | null = null;
		try {
			const dir = await resourceDir();
			const platformName = await platform();
			if (platformName === "windows") {
				iconPath = await join(dir, "icons", "tray.ico");
			} else {
				iconPath = await join(dir, "icons", "tray.png");
			}
		} catch {
			iconPath = null;
		}

		const handleMenuClick = async (id: string) => {
			if (id.startsWith("play_")) {
				if (id === "play_my_music") {
					const vkStore = useVkStore();
					const playlistStore = usePlaylistStore();

					const playlist: TPlaylist = {
						owner_id: vkStore.user_id,
						playlist_id: -1,
						raw_id: `${vkStore.user_id}_-1`,
						title: vkStore.user ? `${vkStore.user.first_name} ${vkStore.user.last_name}` : "Моя музыка",
						cover_url: vkStore.user?.photo_200 || vkStore.user?.photo_max || "",
						description: "",
						size: 0,
						listens: 0,
						last_updated: 0,
						explicit: false,
						followed: false,
						official: false,
						restricted: false,
						access_hash: "",
						follow_hash: "",
						edit_hash: "",
						list: []
					};

					await playlistStore.playPlaylist(playlist, 0, false);
				} else if (id.startsWith("play_pl_")) {
					const parts = id.split("_");
					if (parts.length >= 4 && parts[2] && parts[3]) {
						const ownerId = parseInt(parts[2], 10);
						const playlistId = parseInt(parts[3], 10);
						const playlistStore = usePlaylistStore();

						await playlistStore.loadUserPlaylists(useVkStore().user_id);
						const playlist = playlistStore.getUserPlaylists(useVkStore().user_id).find(p =>
							p.owner_id === ownerId && p.playlist_id === playlistId
						);

						if (playlist) {
							await playlistStore.playPlaylist(playlist, 0, false);
						}
					}
				} else if (id === "play_loading") {
					await loadPlaylists();
				}
			} else {
				if (id === "show") {
					const window = getCurrentWindow();
					await window.show();
					await window.setFocus();
				} else if (id === "quit") {
					const window = getCurrentWindow();
					await window.close();
				}
			}
		};

		const playMyMusic = await MenuItem.new({
			id: "play_my_music",
			text: "Моя музыка",
			action: () => handleMenuClick("play_my_music")
		});

		playMenuItems = [playMyMusic];

		const playSubmenu = await Submenu.new({
			id: "play_submenu",
			text: "Воспроизвести",
			items: playMenuItems
		});

		const showItem = await MenuItem.new({
			id: "show",
			text: "Показать",
			action: () => handleMenuClick("show")
		});

		const quitItem = await MenuItem.new({
			id: "quit",
			text: "Выход",
			action: () => handleMenuClick("quit")
		});

		const mainMenu = await Menu.new({
			items: [playSubmenu, showItem, quitItem]
		});

		trayInstance = await TrayIcon.new({
			tooltip: "Meridius Nova",
			icon: iconPath || undefined,
			menu: mainMenu,
			showMenuOnLeftClick: false,

			action: async (event) => {
				if (event.type === "DoubleClick") {
					const window = getCurrentWindow();

					if (!await window.isVisible()) {
						await window.show();
					} else if (await window.isMinimized()) {
						await window.unminimize();
					}

					await window.setFocus();
				}
			}
		});

		if (iconPath) {
			await trayInstance.setIcon(iconPath);
		}
	};

	const loadPlaylists = async () => {
		if (!isTauri() || typeof window === "undefined" || !trayInstance) {
			return;
		}

		const vkStore = useVkStore();

		if (!vkStore.authenticated) {
			return;
		}

		const playlistStore = usePlaylistStore();
		const playlists = await playlistStore.loadUserPlaylists(vkStore.user_id, true);

		if (playlists && playlists.length > 0) {
			const handleMenuClick = async (id: string) => {
				if (id.startsWith("play_")) {
					if (id === "play_my_music") {
						const vkStore = useVkStore();
						const playlistStore = usePlaylistStore();

						const playlist: TPlaylist = {
							owner_id: vkStore.user_id,
							playlist_id: -1,
							raw_id: `${vkStore.user_id}_-1`,
							title: vkStore.user ? `${vkStore.user.first_name} ${vkStore.user.last_name}` : "Моя музыка",
							cover_url: vkStore.user?.photo_200 || vkStore.user?.photo_max || "",
							description: "",
							size: 0,
							listens: 0,
							last_updated: 0,
							explicit: false,
							followed: false,
							official: false,
							restricted: false,
							access_hash: "",
							follow_hash: "",
							edit_hash: "",
							list: []
						};

						await playlistStore.playPlaylist(playlist, 0, false);
					} else if (id.startsWith("play_pl_")) {
						const parts = id.split("_");
						if (parts.length >= 4 && parts[2] && parts[3]) {
							const ownerId = parseInt(parts[2], 10);
							const playlistId = parseInt(parts[3], 10);
							const playlistStore = usePlaylistStore();

							await playlistStore.loadUserPlaylists(useVkStore().user_id);
							const playlist = playlistStore.getUserPlaylists(useVkStore().user_id).find(p =>
								p.owner_id === ownerId && p.playlist_id === playlistId
							);

							if (playlist) {
								await playlistStore.playPlaylist(playlist, 0, false);
							}
						}
					} else if (id === "play_loading") {
						await loadPlaylists();
					}
				} else {
					if (id === "show") {
						const window = getCurrentWindow();
						await window.show();
						await window.setFocus();
					} else if (id === "quit") {
						const window = getCurrentWindow();
						await window.close();
					}
				}
			};

			const playMyMusic = await MenuItem.new({
				id: "play_my_music",
				text: "Моя музыка",
				action: () => handleMenuClick("play_my_music")
			});

			const newPlayMenuItems: MenuItem[] = [playMyMusic];

			for (const playlist of playlists) {
				const id = `play_pl_${playlist.owner_id}_${playlist.playlist_id}`;

				const playlistItem = await MenuItem.new({
					id,
					text: playlist.title || "",
					action: () => handleMenuClick(id)
				});

				newPlayMenuItems.push(playlistItem);
			}

			playMenuItems = newPlayMenuItems;

			const playSubmenu = await Submenu.new({
				id: "play_submenu",
				text: "Воспроизвести",
				items: playMenuItems
			});

			const showItem = await MenuItem.new({
				id: "show",
				text: "Показать",
				action: () => handleMenuClick("show")
			});

			const quitItem = await MenuItem.new({
				id: "quit",
				text: "Выход",
				action: () => handleMenuClick("quit")
			});

			const mainMenu = await Menu.new({
				items: [playSubmenu, showItem, quitItem]
			});

			await trayInstance.setMenu(mainMenu);
		}
	};

	const destroyTray = async () => {
		if (!isTauri() || typeof window === "undefined" || !trayInstance) {
			return;
		}

		try {
			await trayInstance.close();
			await TrayIcon.removeById(trayInstance.id);
		} catch {
			// Игнорируем ошибки при удалении
		}

		trayInstance = null;
		playMenuItems = [];
	};

	return {
		createTray,
		loadPlaylists,
		destroyTray
	};
};
