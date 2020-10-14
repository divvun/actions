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
const shared_1 = require("../../shared");
const core = __importStar(require("@actions/core"));
const glob = __importStar(require("@actions/glob"));
const path = __importStar(require("path"));
class Autotools {
    constructor(directory) {
        this.directory = directory;
    }
    async makeBuildDir() {
        await shared_1.Bash.runScript("mkdir -p build", { cwd: this.directory });
    }
    async runAutogen() {
        await shared_1.Bash.runScript("./autogen.sh", { cwd: this.directory });
    }
    async runConfigure(flags) {
        await shared_1.Bash.runScript(`../configure ${flags.join(" ")}`, { cwd: path.join(this.directory, "build") });
    }
    async runMake() {
        await shared_1.Bash.runScript("make -j$(nproc)", { cwd: path.join(this.directory, "build") });
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
    for (const input of inputs) {
        const value = core.getInput(input);
        console.log(input, value);
        if (typeof value === "string") {
            if (value.includes(",")) {
                o[input] = value.split(",").map(x => x.trim());
            }
            else if (value === "false") {
                o[input] = false;
            }
            else if (value === "true") {
                o[input] = true;
            }
            else if (value === "") {
            }
            else {
                o[input] = value;
            }
        }
    }
    return o;
}
async function run() {
    const githubWorkspace = process.env.GITHUB_WORKSPACE;
    if (githubWorkspace == null) {
        core.setFailed("GITHUB_WORKSPACE not set, failing.");
        return;
    }
    const requiresDesktopAsMobileWorkaround = core.getInput("force-desktop-spellers-as-mobile");
    const config = deriveInputs([
        "fst",
        "generators",
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
    console.log(JSON.stringify(config, null, 2));
    const flags = [
        "--without-forrest",
        "--disable-silent-rules",
        "--without-xfst"
    ];
    if (config.fst.includes("foma")) {
        flags.push("--with-foma");
    }
    if (!config.fst.includes("hfst")) {
        flags.push("--without-hfst");
    }
    if (config.generators) {
        flags.push("--enable-generators");
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
    await shared_1.Bash.runScript("./autogen.sh && ./configure && make", {
        cwd: path.join(githubWorkspace, "giella-core")
    });
    await shared_1.Bash.runScript("./autogen.sh && ./configure && make", {
        cwd: path.join(githubWorkspace, "giella-shared")
    });
    core.endGroup();
    const builder = new Autotools(path.join(githubWorkspace, "lang"));
    core.debug(`Flags: ${flags}`);
    await builder.build(flags);
    await shared_1.Bash.runScript("ls -lah build/tools/spellcheckers/", { cwd: path.join(githubWorkspace, "lang") });
    if (config.spellers) {
        const out = {
            mobile: {},
            desktop: {}
        };
        const globber = await glob.create(path.join(githubWorkspace, "lang/build/tools/spellcheckers/*.zhfst"), {
            followSymbolicLinks: false
        });
        const files = await globber.glob();
        let hasSomeItems = false;
        for (const candidate of files) {
            if (candidate.endsWith("-mobile.zhfst")) {
                const v = path.basename(candidate).split("-mobile.zhfst")[0];
                out.mobile[v] = path.basename(path.resolve(candidate));
                hasSomeItems = true;
            }
            if (candidate.endsWith("-desktop.zhfst")) {
                const v = path.basename(candidate).split("-desktop.zhfst")[0];
                out.desktop[v] = path.basename(path.resolve(candidate));
                hasSomeItems = true;
            }
        }
        if (!hasSomeItems) {
            throw new Error("Did not find any ZHFST files.");
        }
        if (requiresDesktopAsMobileWorkaround) {
            core.warning("WORKAROUND: FORCING DESKTOP SPELLERS AS MOBILE SPELLERS.");
            for (const [key, value] of Object.entries(out.desktop)) {
                if (out.mobile[key] == null) {
                    out.mobile[key] = value;
                }
            }
        }
        console.log("Saving speller-paths");
        core.setOutput("speller-paths", JSON.stringify(out, null, 0));
        console.log("Setting speller paths to:");
        console.log(JSON.stringify(out, null, 2));
    }
    else {
        console.log("Not setting speller paths.");
    }
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
