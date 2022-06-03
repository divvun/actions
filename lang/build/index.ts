import { Bash } from "../../shared"
import * as core from "@actions/core"
import * as glob from "@actions/glob"
import * as path from "path"

class Autotools {
    private directory: string

    constructor(directory: string) {
        this.directory = directory
    }

    async makeBuildDir() {
        await Bash.runScript("mkdir -p build", { cwd: this.directory })
    }

    async runAutogen() {
        await Bash.runScript("./autogen.sh", { cwd: this.directory })
    }

    async runConfigure(flags: string[]) {
        await Bash.runScript(`../configure ${flags.join(" ")}`, { cwd: path.join(this.directory, "build") })
    }

    async runMake() {
        await Bash.runScript("make -j$(nproc)", { cwd: path.join(this.directory, "build") })
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

    for (const input of inputs) {
        const value: any = core.getInput(input)

        console.log(input, value)

        if (typeof value === "string") {
            if (value.includes(",")) {
                o[input] = value.split(",").map(x => x.trim())
            } else if (value === "false") {
                o[input] = false
            } else if (value === "true") {
                o[input] = true
            } else if (value === "") {
                // Do nothing.
            } else {
                o[input] = value
            }
        }
    }

    return o
}

async function run() {
    const githubWorkspace = process.env.GITHUB_WORKSPACE

    if (githubWorkspace == null) {
        core.setFailed("GITHUB_WORKSPACE not set, failing.")
        return
    }

    const requiresDesktopAsMobileWorkaround = core.getInput("force-desktop-spellers-as-mobile")

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
    ])

    console.log(JSON.stringify(config, null, 2))

    const flags = [
        "--without-forrest",
        "--disable-silent-rules",
        "--without-xfst"
    ]

    // General configuration

    if (config.fst.includes("foma")) {
        flags.push("--with-foma")
    }

    if (!config.fst.includes("hfst")) {
        flags.push("--without-hfst")
    }

    if (config.generators) {
        flags.push("--enable-generators")
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

    core.startGroup("Build giella-core")
    await Bash.runScript("./autogen.sh && ./configure && make", {
        cwd: path.join(githubWorkspace, "giella-core")
    })
    core.endGroup()

    const builder = new Autotools(path.join(githubWorkspace, "lang"))

    core.debug(`Flags: ${flags}`)
    await builder.build(flags)

    await Bash.runScript("ls -lah build/tools/spellcheckers/", { cwd: path.join(githubWorkspace, "lang") })

    if (config.spellers) {
        // Glob the zhfst files made available in the spellcheckers directory.
        // Associate their prefixes as their lang code.
        const out: {
            mobile: { [key: string]: string },
            desktop: { [key: string]: string },
        } = {
            mobile: {},
            desktop: {}
        } 
        
        const globber = await glob.create(path.join(githubWorkspace, "lang/build/tools/spellcheckers/*.zhfst"), {
            followSymbolicLinks: false
        })
        const files = await globber.glob()

        let hasSomeItems = false

        for (const candidate of files) {
            if (candidate.endsWith("-mobile.zhfst")) {
                const v = path.basename(candidate).split("-mobile.zhfst")[0]
                out.mobile[v] = path.basename(path.resolve(candidate))
                hasSomeItems = true
            }

            if (candidate.endsWith("-desktop.zhfst")) {
                const v = path.basename(candidate).split("-desktop.zhfst")[0]
                out.desktop[v] = path.basename(path.resolve(candidate))
                hasSomeItems = true
            }
        }

        if (!hasSomeItems) {
            throw new Error("Did not find any ZHFST files.")
        }

        if (requiresDesktopAsMobileWorkaround) {
            core.warning("WORKAROUND: FORCING DESKTOP SPELLERS AS MOBILE SPELLERS.")
            for (const [key, value] of Object.entries(out.desktop)) {
                if (out.mobile[key] == null) {
                    out.mobile[key] = value
                }
            }
        }

        console.log("Saving speller-paths")

        core.setOutput("speller-paths", JSON.stringify(out, null, 0))
        console.log("Setting speller paths to:")
        console.log(JSON.stringify(out, null, 2))
    } else {
        console.log("Not setting speller paths.")
    }
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
