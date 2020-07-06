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
const toml_1 = __importDefault(require("toml"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("../../shared");
const shared_2 = require("../../shared");
const manifest_1 = require("../manifest");
function loadManifest(manifestPath) {
    const manifestString = fs_1.default.readFileSync(manifestPath, "utf8");
    return shared_1.nonUndefinedProxy(toml_1.default.parse(manifestString), true);
}
function releaseReq(version, platform, dependencies, channel) {
    const req = {
        version,
        platform,
    };
    if (Object.keys(dependencies).length) {
        req.dependencies = dependencies;
    }
    if (channel) {
        req.channel = channel;
    }
    return req;
}
async function run() {
    try {
        const spellerType = core.getInput('speller-type', { required: true });
        const manifest = loadManifest(core.getInput('speller-manifest-path', { required: true }));
        const payloadPath = core.getInput('payload-path', { required: true });
        const version = core.getInput('version', { required: true });
        const channel = core.getInput('channel') || null;
        const pahkatRepo = core.getInput('repo', { required: true });
        const packageId = manifest_1.derivePackageId(spellerType);
        const repoPackageUrl = `${pahkatRepo}packages/${packageId}`;
        let payloadMetadata = null;
        let platform = null;
        let artifactPath = null;
        let artifactUrl = null;
        if (spellerType === manifest_1.SpellerType.Windows) {
            platform = "windows";
            const productCode = shared_1.validateProductCode(shared_2.WindowsExecutableKind.Inno, manifest.windows.system_product_code);
            const ext = path_1.default.extname(payloadPath);
            const pathItems = [packageId, version, platform];
            artifactPath = path_1.default.join(path_1.default.dirname(payloadPath), `${pathItems.join("_")}${ext}`);
            artifactUrl = `${shared_2.PahkatUploader.ARTIFACTS_URL}${path_1.default.basename(artifactPath)}`;
            payloadMetadata = await shared_2.PahkatUploader.release.windowsExecutable(releaseReq(version, platform, { "https://pahkat.uit.no/tools/windivvun": "*" }, channel), artifactUrl, 1, 1, shared_2.WindowsExecutableKind.Inno, productCode, [shared_2.RebootSpec.Install, shared_2.RebootSpec.Uninstall]);
        }
        else if (spellerType === manifest_1.SpellerType.MacOS) {
            platform = "macos";
            const pkgId = manifest.macos.system_pkg_id;
            const ext = path_1.default.extname(payloadPath);
            const pathItems = [packageId, version, platform];
            artifactPath = path_1.default.join(path_1.default.dirname(payloadPath), `${pathItems.join("_")}${ext}`);
            artifactUrl = `${shared_2.PahkatUploader.ARTIFACTS_URL}${path_1.default.basename(artifactPath)}`;
            payloadMetadata = await shared_2.PahkatUploader.release.macosPackage(releaseReq(version, platform, { "https://pahkat.uit.no/tools/macdivvun": "*" }, channel), artifactUrl, 1, 1, pkgId, [shared_2.RebootSpec.Install, shared_2.RebootSpec.Uninstall], [shared_1.MacOSPackageTarget.System, shared_1.MacOSPackageTarget.User]);
        }
        else if (spellerType === manifest_1.SpellerType.Mobile) {
            platform = "mobile";
            const ext = path_1.default.extname(payloadPath);
            const pathItems = [packageId, version, platform];
            artifactPath = path_1.default.join(path_1.default.dirname(payloadPath), `${pathItems.join("_")}${ext}`);
            artifactUrl = `${shared_2.PahkatUploader.ARTIFACTS_URL}${path_1.default.basename(artifactPath)}`;
            payloadMetadata = await shared_2.PahkatUploader.release.tarballPackage(releaseReq(version, platform, {}, channel), artifactUrl, 1, 1);
        }
        else {
            throw new Error(`Unsupported bundle type ${spellerType}`);
        }
        if (payloadMetadata == null) {
            throw new Error("Payload is null; this is a logic error.");
        }
        fs_1.default.writeFileSync("./metadata.toml", payloadMetadata, "utf8");
        if (platform == null) {
            throw new Error("Platform is null; this is a logic error.");
        }
        if (artifactPath == null) {
            throw new Error("artifact path is null; this is a logic error.");
        }
        if (artifactUrl == null) {
            throw new Error("artifact url is null; this is a logic error.");
        }
        await shared_2.PahkatUploader.upload(artifactPath, artifactUrl, "./metadata.toml", repoPackageUrl);
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
