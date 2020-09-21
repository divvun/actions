"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.derivePackageId = void 0;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("../../shared");
const shared_2 = require("../../shared");
const types_1 = require("../types");
function derivePackageId() {
    const repo = github.context.repo.repo;
    if (!repo.startsWith("keyboard-")) {
        throw new Error("Repository is not prefixed with 'keyboard");
    }
    const lang = github.context.repo.repo.split("keyboard-")[1];
    return `keyboard-${lang}`;
}
exports.derivePackageId = derivePackageId;
function releaseReq(version, platform, channel) {
    const req = {
        version,
        platform
    };
    if (channel) {
        req.channel = channel;
    }
    return req;
}
async function run() {
    const payloadPath = core.getInput('payload-path', { required: true });
    const keyboardType = core.getInput('keyboard-type', { required: true });
    const bundlePath = types_1.getBundle();
    const channel = core.getInput('channel') || null;
    const pahkatRepo = core.getInput('repo', { required: true });
    const packageId = derivePackageId();
    const repoPackageUrl = `${pahkatRepo}packages/${packageId}`;
    let payloadMetadata = null;
    let platform = null;
    let version = null;
    let artifactPath = null;
    let artifactUrl = null;
    if (keyboardType === types_1.KeyboardType.MacOS) {
        const target = shared_1.Kbdgen.loadTarget(bundlePath, "mac");
        const pkgId = target.packageId;
        version = target.version;
        platform = "macos";
        const ext = path_1.default.extname(payloadPath);
        const pathItems = [packageId, version, platform];
        artifactPath = path_1.default.join(path_1.default.dirname(payloadPath), `${pathItems.join("_")}${ext}`);
        artifactUrl = `${shared_2.PahkatUploader.ARTIFACTS_URL}${path_1.default.basename(artifactPath)}`;
        payloadMetadata = await shared_2.PahkatUploader.release.macosPackage(releaseReq(version, platform, channel), artifactUrl, 1, 1, pkgId, [shared_2.RebootSpec.Install, shared_2.RebootSpec.Uninstall], [shared_1.MacOSPackageTarget.System, shared_1.MacOSPackageTarget.User]);
    }
    else if (keyboardType === types_1.KeyboardType.Windows) {
        const target = shared_1.Kbdgen.loadTarget(bundlePath, "win");
        const productCode = shared_1.validateProductCode(shared_2.WindowsExecutableKind.Inno, target.uuid);
        version = target.version;
        platform = "windows";
        const ext = path_1.default.extname(payloadPath);
        const pathItems = [packageId, version, platform];
        artifactPath = path_1.default.join(path_1.default.dirname(payloadPath), `${pathItems.join("_")}${ext}`);
        artifactUrl = `${shared_2.PahkatUploader.ARTIFACTS_URL}${path_1.default.basename(artifactPath)}`;
        payloadMetadata = await shared_2.PahkatUploader.release.windowsExecutable(releaseReq(version, platform, channel), artifactUrl, 1, 1, shared_2.WindowsExecutableKind.Inno, productCode, [shared_2.RebootSpec.Install, shared_2.RebootSpec.Uninstall]);
    }
    else {
        throw new Error("Unhandled keyboard type: " + keyboardType);
    }
    if (payloadMetadata == null) {
        throw new Error("Payload is null; this is a logic error.");
    }
    if (version == null) {
        throw new Error("Version is null; this is a logic error.");
    }
    if (platform == null) {
        throw new Error("Platform is null; this is a logic error.");
    }
    if (artifactPath == null) {
        throw new Error("artifact path is null; this is a logic error.");
    }
    if (artifactUrl == null) {
        throw new Error("artifact url is null; this is a logic error.");
    }
    fs_1.default.writeFileSync("./metadata.toml", payloadMetadata, "utf8");
    core.debug(`Renaming from ${payloadPath} to ${artifactPath}`);
    fs_1.default.renameSync(payloadPath, artifactPath);
    await shared_2.PahkatUploader.upload(artifactPath, artifactUrl, "./metadata.toml", repoPackageUrl);
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
