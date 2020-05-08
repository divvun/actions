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
        const manifest = toml_1.default.parse(fs_1.default.readFileSync(manifestPath).toString());
        const bundleType = core.getInput('bundleType');
        const payload = core.getInput('payload');
        const bundle = manifest.bundles[bundleType];
        if (!bundle)
            throw new Error(`No such bundle ${bundleType}`);
        const testDeploy = !!core.getInput('testDeploy');
        const deployScript = path_1.default.join(shared_1.divvunConfigDir(), "repo", "scripts", "pahkat_deploy_new.sh");
        const exit = await exec.exec("bash", [deployScript], {
            env: {
                ...process.env,
                "DEPLOY_SVN_USER": await shared_1.getDivvunEnv("DEPLOY_SVN_USER"),
                "DEPLOY_SVN_PASSWORD": await shared_1.getDivvunEnv("DEPLOY_SVN_PASSWORD"),
                "DEPLOY_SVN_REPO": bundle.repo,
                "DEPLOY_SVN_PKG_ID": bundle.package,
                "DEPLOY_SVN_PKG_PLATFORM": bundle.platform,
                "DEPLOY_SVN_PKG_PAYLOAD": payload,
                "DEPLOY_SVN_PKG_VERSION": manifest.package.version,
                "DEPLOY_SVN_REPO_ARTIFACTS": "https://pahkat.uit.no/artifacts/",
                "DEPLOY_SVN_COMMIT": !testDeploy ? "1" : ""
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
