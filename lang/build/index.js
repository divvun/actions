"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("../../shared");
const core = __importStar(require("@actions/core"));
const path = __importStar(require("path"));
class Autotools {
    constructor(directory) {
        this.directory = directory;
    }
    async makeBuildDir() {
        await shared_1.Bash.runScript("mkdir -p build", this.directory);
    }
    async runAutogen() {
        await shared_1.Bash.runScript("./autogen.sh", this.directory);
    }
    async runConfigure(flags) {
        await shared_1.Bash.runScript(`../configure ${flags.join(" ")}`, path.join(this.directory, "build"));
    }
    async runMake() {
        await shared_1.Bash.runScript("make -j$(nproc)", path.join(this.directory, "build"));
    }
    async build(flags) {
        await this.makeBuildDir();
        await this.runAutogen();
        await this.runConfigure(flags);
        await this.runMake();
    }
}
function deriveInputs(inputs) {
    const o = {};
    for (const input in inputs) {
        o[input] = JSON.parse(core.getInput(input));
    }
    return o;
}
async function run() {
    const githubWorkspace = process.env.GITHUB_WORKSPACE;
    if (githubWorkspace == null) {
        core.setFailed("GITHUB_WORKSPACE not set, failing.");
        return;
    }
    const config = deriveInputs([
        "fst",
        "spellers",
        "hyphenators",
        "analysers",
        "grammar-checkers",
        "hyperminimalisation",
        "reversed-intersect",
        "two-step-intersect",
        "speller-optimisation",
        "backend-format",
        "force-all-tools"
    ]);
    const flags = [
        "--without-forrest",
        "--disable-silent-rules",
        "--without-xfst"
    ];
    if (config.fst.contains("foma")) {
        flags.push("--with-foma");
    }
    if (!config.fst.contains("hfst")) {
        flags.push("--without-hfst");
    }
    if (!config.analysers) {
        flags.push("--disable-analysers");
        flags.push("--disable-generators");
        flags.push("--disable-transcriptors");
    }
    if (config.hyphenators) {
        flags.push("--enable-fst-hyphenator");
    }
    if (config.spellers || config["grammar-checkers"]) {
        flags.push("--enable-spellers");
        flags.push("--disable-hfst-desktop-spellers");
        flags.push("--enable-hfst-mobile-speller");
    }
    if (config["grammar-checkers"]) {
        flags.push("--enable-grammarchecker");
    }
    if (config.hyperminimalisation) {
        flags.push("--enable-hyperminimalisation");
    }
    if (config["reversed-intersect"]) {
        flags.push("--enable-reversed-intersect");
    }
    if (config["twostep-intersect"]) {
        flags.push("--enable-twostep-intersect");
    }
    if (config["backend-format"]) {
        flags.push(`--with-backend-format=${config["backend-format"]}`);
    }
    if (config["minimised-spellers"]) {
        flags.push("--enable-minimised-spellers");
    }
    core.startGroup("Build giella-core and giella-shared");
    await shared_1.Bash.runScript("./autogen.sh && ./configure && make install", path.join(githubWorkspace, "giella-core"));
    await shared_1.Bash.runScript("./autogen.sh && ./configure && make install", path.join(githubWorkspace, "giella-shared"));
    core.endGroup();
    const builder = new Autotools(path.join(githubWorkspace, "lang"));
    core.debug(`Flags: ${flags}`);
    await builder.build(flags);
    await shared_1.Bash.runScript("ls -lah tools/spellcheckers/", path.join(githubWorkspace, "lang"));
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
