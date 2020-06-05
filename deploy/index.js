"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("../shared");
async function run() {
    const packageId = core.getInput('package-id', { required: true });
    const platform = core.getInput('platform', { required: true });
    const payloadPath = core.getInput('payload-path', { required: true });
    const channel = core.getInput('channel') || null;
    const pahkatRepo = core.getInput('repo', { required: true });
    const url = `${pahkatRepo}packages/${packageId}`;
    let version = core.getInput('version', { required: true });
    if (channel === "nightly") {
        version = await shared_1.versionAsNightly(version);
    }
    core.debug("Version: " + version);
    if (platform === "macos") {
        const pkgId = core.getInput('macos-pkg-id', { required: true });
        const rawReqReboot = core.getInput('macos-requires-reboot');
        const rawTargets = core.getInput('macos-targets');
        const requiresReboot = rawReqReboot
            ? rawReqReboot.split(',').map(x => x.trim())
            : [];
        const targets = rawTargets
            ? rawTargets.split(',').map(x => x.trim())
            : [];
        const data = await shared_1.PahkatUploader.payload.macosPackage(1, 1, pkgId, requiresReboot, targets, payloadPath);
        fs_1.default.writeFileSync("./metadata.toml", data, "utf8");
    }
    else {
        throw new Error("Unknown platform: " + platform);
    }
    const isDeploying = shared_1.shouldDeploy() || core.getInput('force-deploy');
    if (!isDeploying) {
        core.warning("Not deploying; ending.");
        return;
    }
    const ext = path_1.default.extname(payloadPath);
    const newPath = path_1.default.join(path_1.default.dirname(payloadPath), `${packageId}_${version}_${platform}${ext}`);
    core.debug(`Renaming from ${payloadPath} to ${newPath}`);
    fs_1.default.renameSync(payloadPath, newPath);
    await shared_1.PahkatUploader.upload(newPath, "./metadata.toml", {
        url,
        version,
        platform,
        channel,
    });
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
