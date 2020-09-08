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
    const cargo = core.getInput("cargo") || null;
    if (cargo == null) {
        return null;
    }
    if (cargo === "true") {
        return shared_1.nonUndefinedProxy(toml_1.default.parse(fs_1.default.readFileSync("./Cargo.toml", "utf8")));
    }
    return shared_1.nonUndefinedProxy(toml_1.default.parse(fs_1.default.readFileSync(cargo, "utf8")));
}
function getSpellerManifestToml() {
    const manifest = core.getInput("speller-manifest") || null;
    if (manifest == null) {
        return null;
    }
    if (manifest === "true") {
        return shared_1.nonUndefinedProxy(toml_1.default.parse(fs_1.default.readFileSync("./manifest.toml", "utf8")));
    }
    return shared_1.nonUndefinedProxy(toml_1.default.parse(fs_1.default.readFileSync(manifest, "utf8")));
}
const SEMVER_TAG_RE = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
function deriveNightly() {
    return !shared_1.isMatchingTag(SEMVER_TAG_RE);
}
async function run() {
    const isNightly = deriveNightly();
    const cargoToml = getCargoToml();
    const spellerManifest = getSpellerManifestToml();
    const csharp = core.getInput("csharp") || null;
    const stableChannel = core.getInput("stable-channel") || null;
    let version;
    if (cargoToml != null) {
        core.debug("Getting version from TOML");
        version = cargoToml.package.version;
    }
    else if (csharp != null) {
        core.debug("Getting version from GitVersioning C#");
        version = process.env.GitBuildVersionSimple;
    }
    else if (spellerManifest != null) {
        core.debug("Getting version from speller manifest");
        version = spellerManifest.version;
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
    else if (stableChannel != null) {
        core.setOutput("channel", stableChannel);
    }
    core.debug("Setting version to: " + version);
    core.setOutput("version", version);
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
