import * as core from "@actions/core"
import { Apt, Pip, ProjectJJ, Ssh } from "../../shared"

function getSudo() {
    const x = core.getInput("sudo")

    if (x === "true") {
        return true
    }
    
    if (x === "false") {
        return false
    }

    throw new Error("invalid value: " + x)
}

async function run() {
    const requiresSudo = getSudo()
    const requiresApertium = !!core.getInput("apertium")
    core.debug("Requires sudo? " + requiresSudo)

    const basePackages = [
        "wget",
        "build-essential",
        "autotools-dev",
        "autoconf",
        "git",
        "pkg-config",
        "gawk",
        "python3-pip",
        "zip",
        "bc"
    ]

    const devPackages = ["foma", "hfst", "libhfst-dev", "cg3-dev", "divvun-gramcheck"]

    if (requiresApertium) {
        devPackages.push("apertium")
        devPackages.push("apertium-dev")
        devPackages.push("apertium-lex-tools")
        devPackages.push("lexd")
    }

    await Apt.update(requiresSudo)
    await Apt.install(basePackages, requiresSudo)
    await Pip.install(["PyYAML"], requiresSudo)
    await ProjectJJ.addNightlyToApt(requiresSudo)
    await Apt.install(devPackages, requiresSudo)
    await Ssh.cleanKnownHosts()
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
