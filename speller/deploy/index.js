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
const exec = __importStar(require("@actions/exec"));
const toml_1 = __importDefault(require("toml"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("../../shared");
function pahkatPlatformFromBundleType(type) {
    if (type == "speller_win" || type == "speller_win_mso" || type == "keyboard_win") {
        return "windows";
    }
    else if (type == "speller_macos" || type == "keyboard_macos") {
        return "macos";
    }
    else if (type == "speller_mobile") {
        return "mobile";
    }
    throw new Error(`Invalid bundle type for Pahkat: ${type}`);
}
async function run() {
    try {
        const manifestPath = core.getInput('manifest');
        const bundleType = core.getInput('bundleType');
        const payload = core.getInput('payload');
        const manifest = toml_1.default.parse(fs_1.default.readFileSync(manifestPath).toString());
        if (!(bundleType in manifest.bundles))
            throw new Error(`No such bundle ${bundleType}`);
        let payloadMetadataString = "";
        const options = {
            listeners: {
                stdout: (data) => {
                    payloadMetadataString += data.toString();
                }
            }
        };
        let version = manifest.package.version;
        if (bundleType === "speller_win" || bundleType === "speller_win_mso") {
            const productCode = `{${manifest.bundles[bundleType].uuid}}`;
            const exit = await exec.exec("pahkat-repomgr", [
                "payload", "windows-executable",
                "-i", "1",
                "-s", "1",
                "-k", "nsis",
                "-p", productCode,
                "-u", "pahkat:payload",
                "-r", "install,uninstall"
            ], options);
            if (exit != 0) {
                throw new Error("bundling failed");
            }
        }
        else if (bundleType === "keyboard_win") {
            const target = shared_1.loadKbdgenTarget(`${manifest.package.name}.kbdgen`, "win");
            console.log(target);
            if (!target.uuid) {
                throw new Error("no uuid found");
            }
            version = target.version;
            const exit = await exec.exec("pahkat-repomgr", [
                "payload", "windows-executable",
                "-i", "1",
                "-s", "1",
                "-k", "inno",
                "-p", target.uuid,
                "-u", "pahkat:payload",
                "-r", "install,uninstall"
            ], options);
            if (exit != 0) {
                throw new Error("bundling failed");
            }
        }
        else if (bundleType === "speller_macos") {
            const exit = await exec.exec("pahkat-repomgr", [
                "payload", "macos-package",
                "-p", manifest.bundles.speller_macos.pkg_id,
                "-i", "1",
                "-s", "1",
                "-u", "pahkat:payload",
                "-r", "install,uninstall",
                "-t", "system,user"
            ], options);
            if (exit != 0) {
                throw new Error("bundling failed");
            }
        }
        else if (bundleType === "keyboard_macos") {
            const target = shared_1.loadKbdgenTarget(`${manifest.package.name}.kbdgen`, "mac");
            console.log(target);
            if (!target.packageId) {
                throw new Error("no packageId found");
            }
            version = target.version;
            const exit = await exec.exec("pahkat-repomgr", [
                "payload", "macos-package",
                "-p", target.packageId,
                "-i", "1",
                "-s", "1",
                "-u", "pahkat:payload",
                "-r", "install,uninstall",
                "-t", "system,user"
            ], options);
            if (exit != 0) {
                throw new Error("bundling failed");
            }
        }
        else if (bundleType === "speller_mobile") {
            const exit = await exec.exec("pahkat-repomgr", [
                "payload", "tarball-package",
                "-i", "1",
                "-s", "1",
                "-u", "pahkat:payload",
            ], options);
            if (exit != 0) {
                throw new Error("bundling failed");
            }
        }
        else {
            throw new Error(`Unsupported bundle type ${bundleType}`);
        }
        if (!version)
            throw new Error("no version specified");
        const bundle = manifest.bundles[bundleType];
        const payloadMetadataPath = "./payload.toml";
        fs_1.default.writeFileSync(payloadMetadataPath, payloadMetadataString, "utf8");
        const testDeploy = !!core.getInput('testDeploy') || !shared_1.shouldDeploy();
        const isDeploying = !testDeploy || core.getInput('forceDeploy');
        const env = shared_1.loadEnv();
        const deployScript = path_1.default.join(shared_1.divvunConfigDir(), "repo", "scripts", "pahkat_deploy_new.sh");
        const exit = await exec.exec("bash", [deployScript], {
            env: {
                ...process.env,
                "DEPLOY_SVN_USER": env.svn.username,
                "DEPLOY_SVN_PASSWORD": env.svn.password,
                "DEPLOY_SVN_REPO": bundle.repo,
                "DEPLOY_SVN_PKG_ID": bundle.package,
                "DEPLOY_SVN_PKG_PLATFORM": bundle.platform || pahkatPlatformFromBundleType(bundleType),
                "DEPLOY_SVN_PKG_PAYLOAD": path_1.default.resolve(payload),
                "DEPLOY_SVN_PKG_PAYLOAD_METADATA": path_1.default.resolve(payloadMetadataPath),
                "DEPLOY_SVN_PKG_VERSION": version,
                "DEPLOY_SVN_REPO_ARTIFACTS": "https://pahkat.uit.no/artifacts/",
                "DEPLOY_SVN_COMMIT": isDeploying ? "1" : ""
            }
        });
        if (exit != 0) {
            throw new Error("deploy failed");
        }
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run();
