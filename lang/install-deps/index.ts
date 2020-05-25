import { Apt, Pip, ProjectJJ, Ssh } from "../../shared"

async function run() {
    await Apt.update()
    await Apt.install([
        "wget",
        "build-essential",
        "autotools-dev",
        "autoconf",
        "git",
        "pkg-config",
        "gawk",
        "python3-pip",
        "zip"
    ])
    await Pip.install(["PyYAML"])
    await ProjectJJ.addNightlyToApt()
    await Apt.install(["foma", "hfst", "libhfst-dev", "cg3-dev", "divvun-gramcheck"])
    await Ssh.cleanKnownHosts()
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
