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
    core.debug("Requires sudo? " + requiresSudo)

    await Apt.update(requiresSudo)
    await Apt.install([
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
    ], requiresSudo)
    await Pip.install(["PyYAML"], requiresSudo)
    await ProjectJJ.addNightlyToApt(requiresSudo)
    await Apt.install(["foma", "hfst", "libhfst-dev", "cg3-dev", "divvun-gramcheck"], requiresSudo)
    await Ssh.cleanKnownHosts()
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
