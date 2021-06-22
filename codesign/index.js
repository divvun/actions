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
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("../shared");
const delay = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms));
async function run() {
    const filePath = path_1.default.resolve(core.getInput('path', { required: true }));
    const fileName = filePath.split(path_1.default.sep).pop();
    const sec = shared_1.secrets();
    if (process.platform == "win32") {
        await exec.exec("signtool.exe", [
            "sign", "/t", shared_1.RFC3161_URL,
            "/f", shared_1.DIVVUN_PFX, "/p", sec.windows.pfxPassword,
            filePath
        ]);
    }
    else if (process.platform === "darwin") {
        const { developerAccount, appPassword, appCodeSignId, teamId } = sec.macos;
        await exec.exec("codesign", ["-s", appCodeSignId, filePath, "--timestamp", "--options=runtime"]);
    }
    else {
        throw new Error("Unsupported platform: " + process.platform);
    }
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
