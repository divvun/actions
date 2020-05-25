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
async function run() {
    const githubWorkspace = process.env.GITHUB_WORKSPACE;
    if (githubWorkspace == null) {
        core.setFailed("GITHUB_WORKSPACE not set, failing.");
        return;
    }
    core.startGroup("Build giella-core and giella-shared");
    await shared_1.Bash.runScript("./autogen.sh && ./configure && make install", path.join(githubWorkspace, "giella-core"));
    await shared_1.Bash.runScript("./autogen.sh && ./configure && make install", path.join(githubWorkspace, "giella-shared"));
    core.endGroup();
    const builder = new Autotools(path.join(githubWorkspace, "lang"));
    await builder.build([
        "--without-forrest",
        "--with-hfst",
        "--without-xfst",
        "--enable-reversed-intersect",
        "--disable-hfst-desktop-spellers",
        "--enable-spellers",
        "--enable-hfst-mobile-speller"
    ]);
    await shared_1.Bash.runScript("ls -lah tools/spellcheckers/", path.join(githubWorkspace, "lang"));
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
