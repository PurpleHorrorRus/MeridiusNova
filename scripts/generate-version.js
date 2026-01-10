const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function getBranch() {
	const githubRef = process.env.GITHUB_REF || "";
	if (githubRef.startsWith("refs/heads/")) {
		return githubRef.replace("refs/heads/", "");
	}
	if (githubRef.startsWith("refs/tags/")) {
		const tag = githubRef.replace("refs/tags/", "");
		if (tag.includes("-beta.")) {
			return "beta";
		}
		if (tag.includes("-")) {
			return "development";
		}
		return "production";
	}

	try {
		const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
		return branch;
	} catch {
		return "development";
	}
}

function getShortCommitHash() {
	try {
		return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
	} catch {
		return "unknown";
	}
}

function getNumericCommitId() {
	try {
		const hash = execSync("git rev-parse --short=4 HEAD", { encoding: "utf-8" }).trim();
		return parseInt(hash, 16) % 65536;
	} catch {
		return Math.floor(Math.random() * 65536);
	}
}

function getBetaNumber() {
	try {
		const tags = execSync("git tag --list '*-beta.*' --sort=-version:refname", { encoding: "utf-8" }).trim();
		if (!tags) {
			return 1;
		}
		const betaTags = tags.split("\n").filter((tag) => tag.includes("-beta."));
		if (betaTags.length === 0) {
			return 1;
		}
		const lastTag = betaTags[0];
		const match = lastTag.match(/-beta\.(\d+)$/);
		if (match) {
			return parseInt(match[1], 10) + 1;
		}
		return 1;
	} catch {
		return 1;
	}
}

function readVersionFromConfig() {
	const tauriConfigPath = path.join(__dirname, "..", "src-tauri", "tauri.conf.json");
	const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, "utf-8"));
	return tauriConfig.version;
}

function updateVersionInFiles(version) {
	const tauriConfigPath = path.join(__dirname, "..", "src-tauri", "tauri.conf.json");
	const cargoTomlPath = path.join(__dirname, "..", "src-tauri", "Cargo.toml");

	const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, "utf-8"));
	tauriConfig.version = version;

	const githubRepo = process.env.REPOSITORY || "";
	if (githubRepo && tauriConfig.plugins?.updater) {
		const [owner, repo] = githubRepo.split("/");
		const publicKey = process.env.TAURI_PUBLIC_KEY || "{{TAURI_PUBLIC_KEY}}";
		tauriConfig.plugins.updater.endpoints = [
			`https://api.github.com/repos/${owner}/${repo}/releases/latest`
		];
		if (publicKey !== "{{TAURI_PUBLIC_KEY}}") {
			tauriConfig.plugins.updater.pubkey = publicKey;
		}
	}

	fs.writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, "\t") + "\n");

	const cargoToml = fs.readFileSync(cargoTomlPath, "utf-8");
	const updatedCargoToml = cargoToml.replace(/^version = ".*"$/m, `version = "${version}"`);
	fs.writeFileSync(cargoTomlPath, updatedCargoToml);
}

function main() {
	const branch = getBranch();
	let version;

	if (branch === "production") {
		version = readVersionFromConfig();
	} else if (branch === "beta") {
		const baseVersion = readVersionFromConfig();
		const betaNumber = getBetaNumber();
		version = `${baseVersion}-beta.${betaNumber}`;
	} else {
		const baseVersion = readVersionFromConfig();
		const commitId = getNumericCommitId();
		version = `${baseVersion}-${commitId}`;
	}

	console.log(`Generating version: ${version} for branch: ${branch}`);
	updateVersionInFiles(version);
	console.log(`Version updated to: ${version}`);
}

main();

