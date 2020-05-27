"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
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
    if (keyboardType === types_1.KeyboardType.Android) {
        shared_1.Kbdgen.setBuildTimestamp(bundlePath, "android");
        payloadPath = await shared_1.Kbdgen.buildAndroid(bundlePath);
    }
    else if (keyboardType === types_1.KeyboardType.iOS) {
        shared_1.Kbdgen.setBuildTimestamp(bundlePath, "ios");
        payloadPath = await shared_1.Kbdgen.build_iOS(bundlePath);
    }
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
