export const isTauri = (): boolean => {
    return typeof window !== "undefined"
        && window.navigator.userAgent.includes("Meridius-Nova-Tauri");
};