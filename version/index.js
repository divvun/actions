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
        return shared_1.nonUndefinedProxy(toml_1.default.parse(fs_1.default.readFileSync("./Cargo.toml", "utf8")));
    }
    return shared_1.nonUndefinedProxy(toml_1.default.parse(fs_1.default.readFileSync(cargo, "utf8")));
}
function deriveNightly() {
    const nightly = core.getInput("nightly");
    core.debug(`nightly input: '${nightly}'`);
    if (nightly === "true") {
        return true;
    }
    return shared_1.isCurrentBranch(nightly.split(",").map(x => x.trim()));
}
async function run() {
    const isNightly = deriveNightly();
    const cargoToml = getCargoToml();
    const csharp = core.getInput("csharp");
    let version;
    if (cargoToml != null) {
        core.debug("Getting version from TOML");
        version = cargoToml.package.version;
    }
    else if (csharp != null) {
        core.debug("Getting version from GitVersioning C#");
        version = process.env.GitBuildVersionSimple;
    }
    else {
        throw new Error("Did not find a suitable mechanism to derive the version.");
    }
    if (version == null) {
        throw new Error("Did not find any version.");
    }
    if (isNightly) {
        core.debug("Generating nightly version");
        version = await shared_1.versionAsNightly(version);
        core.setOutput("channel", "nightly");
    }
    core.debug("Setting version to: " + version);
    core.setOutput("version", version);
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
