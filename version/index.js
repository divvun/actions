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
const fs_1 = __importDefault(require("fs"));
const toml_1 = __importDefault(require("toml"));
const shared_1 = require("../shared");
function getCargoToml() {
    const cargo = core.getInput("cargo");
    if (cargo == null) {
        return null;
    }
    if (cargo === "true") {
        return toml_1.default.parse(fs_1.default.readFileSync("./Cargo.toml", "utf8"));
    }
    return toml_1.default.parse(fs_1.default.readFileSync(cargo, "utf8"));
}
async function run() {
    const isNightly = core.getInput("nightly") === "true";
    const cargoToml = getCargoToml();
    if (cargoToml != null) {
        let { version } = cargoToml;
        if (isNightly) {
            version = await shared_1.versionAsNightly(version);
        }
        core.setOutput("version", version);
    }
    else {
        throw new Error("Did not find a suitable mechanism to derive the version.");
    }
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
