import { Bash } from "../../shared"
import * as core from "@actions/core"
import * as path from "path"

class Autotools {
    private directory: string

    constructor(directory: string) {
        this.directory = directory
    }

    async makeBuildDir() {
        await Bash.runScript("mkdir -p build", this.directory)
    }

    async runAutogen() {
        await Bash.runScript("./autogen.sh", this.directory)
    }

    async runConfigure(flags: string[]) {
        await Bash.runScript(`../configure ${flags.join(" ")}`, path.join(this.directory, "build"))
    }

    async runMake() {
        await Bash.runScript("make -j$(nproc)", path.join(this.directory, "build"))
    }

    async build(flags: string[]) {
        await this.makeBuildDir()
        await this.runAutogen()
        await this.runConfigure(flags)
        await this.runMake()
    }
}

function deriveInputs(inputs: string[]): { [key: string]: any } {
    const o: { [key: string]: any } = {}

    for (const input in inputs) {
        o[input] = JSON.parse(core.getInput(input))
    }

    return o
}

async function run() {
    const githubWorkspace = process.env.GITHUB_WORKSPACE

    if (githubWorkspace == null) {
        core.setFailed("GITHUB_WORKSPACE not set, failing.")
        return
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
    ])

    const flags = [
        "--without-forrest",
        "--disable-silent-rules",
        "--without-xfst"
    ]

    // General configuration

    if (config.fst.contains("foma")) {
        flags.push("--with-foma")
    }

    if (!config.fst.contains("hfst")) {
        flags.push("--without-hfst")
    }

    if (!config.analysers) {
        flags.push("--disable-analysers")
        flags.push("--disable-generators")
        flags.push("--disable-transcriptors")
    }

    if (config.hyphenators) {
        flags.push("--enable-fst-hyphenator")
    }

    if (config.spellers || config["grammar-checkers"]) {
        flags.push("--enable-spellers")
        flags.push("--disable-hfst-desktop-spellers")
        flags.push("--enable-hfst-mobile-speller")
    }

    if (config["grammar-checkers"]) {
        flags.push("--enable-grammarchecker")
    }

    // Language-specific optimisations

    if (config.hyperminimalisation) {
        flags.push("--enable-hyperminimalisation")
    }

    if (config["reversed-intersect"]) {
        flags.push("--enable-reversed-intersect")
    }

    if (config["twostep-intersect"]) {
        flags.push("--enable-twostep-intersect")
    }

    if (config["backend-format"]) {
        flags.push(`--with-backend-format=${config["backend-format"]}`)
    }

    if (config["minimised-spellers"]) {
        flags.push("--enable-minimised-spellers")
    }

    // Begin build

    core.startGroup("Build giella-core and giella-shared")
    await Bash.runScript("./autogen.sh && ./configure && make install", path.join(githubWorkspace, "giella-core"))
    await Bash.runScript("./autogen.sh && ./configure && make install", path.join(githubWorkspace, "giella-shared"))
    core.endGroup()

    const builder = new Autotools(path.join(githubWorkspace, "lang"))

    core.debug(`Flags: ${flags}`)
    await builder.build(flags)

    await Bash.runScript("ls -lah tools/spellcheckers/", path.join(githubWorkspace, "lang"))
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
