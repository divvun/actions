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

async function run() {
    const githubWorkspace = process.env.GITHUB_WORKSPACE

    if (githubWorkspace == null) {
        core.setFailed("GITHUB_WORKSPACE not set, failing.")
        return
    }

    core.startGroup("Build giella-core and giella-shared")
    await Bash.runScript("./autogen.sh && ./configure && make install", path.join(githubWorkspace, "giella-core"))
    await Bash.runScript("./autogen.sh && ./configure && make install", path.join(githubWorkspace, "giella-shared"))
    core.endGroup()

    const builder = new Autotools(path.join(githubWorkspace, "lang"))

    await builder.build([
        "--without-forrest",
        "--with-hfst",
        "--without-xfst",
        "--enable-reversed-intersect",
        "--disable-hfst-desktop-spellers",
        "--enable-spellers",
        "--enable-hfst-mobile-speller"
    ])

    await Bash.runScript("ls -lah tools/spellcheckers/", path.join(githubWorkspace, "lang"))
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
