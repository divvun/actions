import * as core from '@actions/core'
import fs from "fs"

import toml from "toml"
import { versionAsNightly, isCurrentBranch, nonUndefinedProxy } from '../shared'

function getCargoToml() {
    const cargo = core.getInput("cargo")

    if (cargo == null) {
        return null
    }

    if (cargo === "true") {
        return nonUndefinedProxy(toml.parse(fs.readFileSync("./Cargo.toml", "utf8")))
    }

    return nonUndefinedProxy(toml.parse(fs.readFileSync(cargo, "utf8")))
}

function deriveNightly() {
    const nightly = core.getInput("nightly")
    
    if (nightly === "true") {
        return true
    }

    return isCurrentBranch(nightly.split(",").map(x => x.trim()))
}

async function run() {
    const isNightly = deriveNightly()
    const cargoToml = getCargoToml()
    const csharp = core.getInput("csharp")

    let version 

    if (cargoToml != null) {
        version = cargoToml.package.version
    } else if (csharp != null) {
        version = process.env.GitBuildVersionSimple
    } else {
        throw new Error("Did not find a suitable mechanism to derive the version.")
    }

    if (version == null) {
        throw new Error("Did not find any version.")
    }

    if (isNightly) {
        core.debug("Generating nightly version")
        version = await versionAsNightly(version)

        core.setOutput("channel", "nightly")
    }

    core.debug("Setting version to: " + version)
    core.setOutput("version", version)
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})