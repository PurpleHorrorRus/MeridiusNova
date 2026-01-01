import semver from "semver";
import type { TSettings } from "~~/server/utils/types";

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const channel = (query.channel as string) || "production";
	const currentVersion = (query.currentVersion as string) || "0.0.0";

	const githubRepo = process.env.GITHUB_REPOSITORY || "";
	if (!githubRepo) {
		return {
			available: false,
			error: "GitHub repository not configured"
		};
	}

	const [owner, repo] = githubRepo.split("/");

	const releasesResponse = await fetch(
		`https://api.github.com/repos/${owner}/${repo}/releases?per_page=50`,
		{
			headers: {
				"Accept": "application/vnd.github.v3+json",
				"User-Agent": "Meridius-Nova-Updater"
			}
		}
	).catch(() => null);

	if (!releasesResponse || !releasesResponse.ok) {
		return {
			available: false,
			error: "Failed to fetch releases from GitHub"
		};
	}

	const releases = await releasesResponse.json().catch(() => null);

	if (!releases || !Array.isArray(releases)) {
		return {
			available: false,
			error: "Invalid releases data"
		};
	}

	let targetReleases: any[] = [];

	if (channel === "production") {
		targetReleases = releases.filter((r: any) => !r.prerelease && !r.draft);
	} else if (channel === "beta") {
		targetReleases = releases.filter((r: any) => 
			r.prerelease && 
			!r.draft && 
			r.tag_name.includes("-beta.")
		);
	} else if (channel === "development") {
		targetReleases = releases.filter((r: any) => 
			r.prerelease && 
			!r.draft && 
			!r.tag_name.includes("-beta.") &&
			r.tag_name.includes("-")
		);
	}

	targetReleases.sort((a, b) => {
		const versionA = semver.valid(semver.coerce(a.tag_name.replace(/^v/, ""))) || "0.0.0";
		const versionB = semver.valid(semver.coerce(b.tag_name.replace(/^v/, ""))) || "0.0.0";
		return semver.rcompare(versionA, versionB);
	});

	const targetRelease = targetReleases[0] || null;

	if (!targetRelease) {
		return {
			available: false,
			version: currentVersion
		};
	}

	const releaseVersion = targetRelease.tag_name.replace(/^v/, "");
	
	const currentSemver = semver.valid(semver.coerce(currentVersion));
	const releaseSemver = semver.valid(semver.coerce(releaseVersion));

	if (!currentSemver || !releaseSemver) {
		return {
			available: false,
			error: "Invalid version format"
		};
	}

	const isNewer = semver.gt(releaseSemver, currentSemver);

	if (!isNewer) {
		return {
			available: false,
			version: currentVersion,
			latestVersion: releaseVersion
		};
	}

	const platform = process.platform === "win32" ? "windows" : "linux";
	const asset = targetRelease.assets.find((a: any) => {
		const name = a.name.toLowerCase();
		return (
			(platform === "windows" && name.endsWith(".exe")) ||
			(platform === "linux" && (name.endsWith(".appimage") || name.endsWith(".deb")))
		);
	});

	if (!asset) {
		return {
			available: false,
			error: "No suitable asset found for current platform"
		};
	}

	return {
		available: true,
		version: releaseVersion,
		url: asset.browser_download_url,
		body: targetRelease.body || "",
		date: targetRelease.published_at,
		size: asset.size
	};
});

