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
const shared_1 = require("../../shared");
const shared_2 = require("../../shared");
const manifest_1 = require("../manifest");
function loadManifest(manifestPath) {
    const manifestString = fs_1.default.readFileSync(manifestPath, "utf8");
    return shared_1.nonUndefinedProxy(toml_1.default.parse(manifestString), true);
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
        const url = `${pahkatRepo}packages/${packageId}`;
        let payloadMetadata = null;
        let platform = null;
        if (spellerType === manifest_1.SpellerType.Windows || spellerType === manifest_1.SpellerType.WindowsMSOffice) {
            platform = "windows";
            let productCode;
            if (spellerType === manifest_1.SpellerType.Windows) {
                productCode = manifest.windows.system_product_code;
            }
            else {
                productCode = manifest.windows.msoffice_product_code;
            }
            productCode = shared_1.validateProductCode(shared_2.WindowsExecutableKind.Nsis, productCode);
            payloadMetadata = await shared_2.PahkatUploader.payload.windowsExecutable(1, 1, shared_2.WindowsExecutableKind.Nsis, productCode, [shared_2.RebootSpec.Install, shared_2.RebootSpec.Uninstall], payloadPath);
        }
        else if (spellerType === manifest_1.SpellerType.MacOS) {
            platform = "macos";
            const pkgId = manifest.macos.system_pkg_id;
            payloadMetadata = await shared_2.PahkatUploader.payload.macosPackage(1, 1, pkgId, [shared_2.RebootSpec.Install, shared_2.RebootSpec.Uninstall], [shared_1.MacOSPackageTarget.System, shared_1.MacOSPackageTarget.User], payloadPath);
        }
        else if (spellerType === manifest_1.SpellerType.Mobile) {
            platform = "mobile";
            payloadMetadata = await shared_2.PahkatUploader.payload.tarballPackage(1, 1, payloadPath);
        }
        else {
            throw new Error(`Unsupported bundle type ${spellerType}`);
        }
        if (payloadMetadata == null) {
            throw new Error("Payload is null; this is a logic error.");
        }
        if (platform == null) {
            throw new Error("Platform is null; this is a logic error.");
        }
        fs_1.default.writeFileSync("./payload.toml", payloadMetadata, "utf8");
        const isDeploying = shared_1.shouldDeploy() || core.getInput('force-deploy');
        if (!isDeploying) {
            core.warning("Not deploying; ending.");
            return;
        }
        await shared_2.PahkatUploader.upload(payloadPath, "./payload.toml", {
            url,
            version,
            platform,
            channel,
        });
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
