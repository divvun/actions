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
var PackageType;
(function (PackageType) {
    PackageType["MacOSPackage"] = "MacOSPackage";
    PackageType["WindowsExecutable"] = "WindowsExecutable";
    PackageType["TarballPackage"] = "TarballPackage";
})(PackageType || (PackageType = {}));
function getPlatformAndType() {
    let platform = core.getInput('platform');
    const givenType = core.getInput('type');
    if (givenType == null) {
        if (platform == null) {
            throw new Error("Either platform or type must be set.");
        }
        if (platform === "macos") {
            return {
                packageType: PackageType.MacOSPackage,
                platform
            };
        }
        else if (platform === "windows") {
            return {
                packageType: PackageType.WindowsExecutable,
                platform
            };
        }
        else {
            return {
                packageType: PackageType.TarballPackage,
                platform
            };
        }
    }
    if (platform == null) {
        switch (givenType) {
            case PackageType.MacOSPackage:
                platform = "macos";
                break;
            case PackageType.WindowsExecutable:
                platform = "windows";
                break;
            case PackageType.TarballPackage:
                throw new Error("Cannot detect platform from only a package type of TarballPackage");
        }
    }
    switch (givenType) {
        case PackageType.MacOSPackage:
        case PackageType.WindowsExecutable:
        case PackageType.TarballPackage:
            return { packageType: givenType, platform };
        default:
            throw new Error("Unhandled package type: " + givenType);
    }
}
async function run() {
    const packageId = core.getInput('package-id', { required: true });
    const { packageType, platform } = getPlatformAndType();
    const payloadPath = core.getInput('payload-path', { required: true });
    const channel = core.getInput('channel') || null;
    const pahkatRepo = core.getInput('repo', { required: true });
    const url = `${pahkatRepo}packages/${packageId}`;
    let version = core.getInput('version', { required: true });
    core.debug("Version: " + version);
    if (packageType === PackageType.MacOSPackage) {
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
    else if (packageType === PackageType.WindowsExecutable) {
        let productCode = core.getInput("windows-product-code", { required: true });
        const kind = core.getInput("windows-kind");
        const rawReqReboot = core.getInput('windows-requires-reboot');
        const requiresReboot = rawReqReboot
            ? rawReqReboot.split(',').map(x => x.trim())
            : [];
        switch (kind) {
            case shared_1.WindowsExecutableKind.Inno:
            case shared_1.WindowsExecutableKind.Nsis:
            case shared_1.WindowsExecutableKind.Msi:
                productCode = shared_1.validateProductCode(kind, productCode);
                break;
            case null:
                core.debug("No Windows kind provided, not validating product code.");
                break;
            default:
                throw new Error("Unhandled Windows executable kind: " + kind);
        }
        const data = await shared_1.PahkatUploader.payload.windowsExecutable(1, 1, kind, productCode, requiresReboot, payloadPath);
        fs_1.default.writeFileSync("./metadata.toml", data, "utf8");
    }
    else {
        throw new Error("Unhandled package type: " + packageType);
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
