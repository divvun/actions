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
const shared_1 = require("../../shared");
const types_1 = require("../types");
async function run() {
    const keyboardType = core.getInput("keyboard-type", { required: true });
    const bundlePath = core.getInput("bundle-path", { required: true });
    if (keyboardType !== types_1.KeyboardType.iOS && keyboardType !== types_1.KeyboardType.Android) {
        throw new Error(`Unsupported keyboard type for meta build: ${keyboardType}`);
    }
    await shared_1.Kbdgen.fetchMetaBundle(bundlePath);
    let payloadPath;
    let buildStart = 0;
    const githubRepo = process.env.GITHUB_REPOSITORY;
    if (githubRepo === "divvun/divvun-keyboard") {
        if (keyboardType === types_1.KeyboardType.Android) {
            buildStart = 1590918851;
        }
    }
    else if (githubRepo === "divvun/divvun-dev-keyboard") {
    }
    else {
        throw new Error(`Unsupported repository for release builds: ${githubRepo}`);
    }
    if (keyboardType === types_1.KeyboardType.Android) {
        shared_1.Kbdgen.setBuildNumber(bundlePath, "android", buildStart);
        payloadPath = await shared_1.Kbdgen.buildAndroid(bundlePath, githubRepo);
    }
    else if (keyboardType === types_1.KeyboardType.iOS) {
        shared_1.Kbdgen.setBuildNumber(bundlePath, "ios", buildStart);
        payloadPath = await shared_1.Kbdgen.build_iOS(bundlePath);
    }
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
