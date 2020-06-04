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
    const bundlePath = types_1.getBundle();
    if (keyboardType === types_1.KeyboardType.iOS || keyboardType === types_1.KeyboardType.Android) {
        throw new Error(`Unsupported keyboard type for non-meta build: ${keyboardType}`);
    }
    let payloadPath;
    if (keyboardType === types_1.KeyboardType.MacOS) {
        await shared_1.Kbdgen.setNightlyVersion(bundlePath, "mac");
        payloadPath = await shared_1.Kbdgen.buildMacOS(bundlePath);
    }
    else if (keyboardType === types_1.KeyboardType.Windows) {
        await shared_1.Kbdgen.setNightlyVersion(bundlePath, "win");
        payloadPath = await shared_1.Kbdgen.buildWindows(bundlePath);
    }
    else {
        throw new Error(`Unhandled keyboard type: ${keyboardType}`);
    }
    core.setOutput("payload-path", payloadPath);
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
