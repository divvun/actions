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
async function run() {
    try {
        const manifestPath = core.getInput('manifest');
        const bundleType = core.getInput('bundleType');
        const payload = core.getInput('payload');
        const manifest = toml_1.default.parse(fs_1.default.readFileSync(manifestPath).toString());
        const bundle = manifest.bundles[bundleType];
        if (!bundle)
            throw new Error(`No such bundle ${bundleType}`);
        let payloadMetadataString = "";
        const options = {
            listeners: {
                stdout: (data) => {
                    payloadMetadataString += data.toString();
                }
            }
        };
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
        if (bundleType === "speller_macos") {
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
        if (bundleType === "speller_mobile") {
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
                "DEPLOY_SVN_PKG_PLATFORM": bundle.platform,
                "DEPLOY_SVN_PKG_PAYLOAD": path_1.default.resolve(payload),
                "DEPLOY_SVN_PKG_PAYLOAD_METADATA": path_1.default.resolve(payloadMetadataPath),
                "DEPLOY_SVN_PKG_VERSION": manifest.package.version,
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
