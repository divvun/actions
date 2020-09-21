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
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const os = __importStar(require("os"));
const shared_1 = require("../shared");
function getSetupScript() {
    if (process.platform == "darwin")
        return `${__dirname}/setup-macos.sh`;
    if (process.platform == "win32")
        return `${__dirname}/setup-win.sh`;
    if (process.platform == "linux")
        return `${__dirname}/setup-linux.sh`;
    throw new Error(`Unsupported platform ${process.platform}`);
}
async function run() {
    try {
        const divvunKey = core.getInput("key", { required: true });
        core.setSecret(divvunKey);
        console.log("Setting up environment");
        await exec.exec("bash", [getSetupScript()], {
            cwd: process.env.RUNNER_WORKSPACE,
            env: {
                "DIVVUN_KEY": divvunKey,
                "HOME": os.homedir()
            }
        });
        if (process.platform == "win32") {
            core.addPath("C:\\Program Files (x86)\\Microsoft SDKs\\ClickOnce\\SignTool");
        }
        core.exportVariable("DIVVUN_KEY", divvunKey);
        core.exportVariable("DIVVUN_CI_CONFIG", shared_1.divvunConfigDir());
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
