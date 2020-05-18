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
async function run() {
    try {
        const manifestPath = core.getInput('manifest');
        const manifest = toml_1.default.parse(fs_1.default.readFileSync(manifestPath).toString());
        const bundleType = core.getInput('bundleType');
        const bundle = manifest.bundles[bundleType];
        if (!bundle) {
            core.warning(`No bundle config specified for ${bundleType}`);
            return;
        }
        core.setOutput("bundleExists", "true");
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run();
