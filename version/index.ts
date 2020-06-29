import * as core from '@actions/core'
import fs from "fs"

import toml from "toml"
import { versionAsNightly } from '../shared'

function getCargoToml() {
    const cargo = core.getInput("cargo")

    if (cargo == null) {
        return null
    }

    if (cargo === "true") {
        return toml.parse(fs.readFileSync("./Cargo.toml", "utf8"))
    }

    return toml.parse(fs.readFileSync(cargo, "utf8"))
}

async function run() {
    const isNightly = core.getInput("nightly") === "true"
    const cargoToml = getCargoToml()

    if (cargoToml != null) {
        let { version } = cargoToml

        if (isNightly) {
            version = await versionAsNightly(version)
        }

        core.setOutput("version", version)
    } else {
        throw new Error("Did not find a suitable mechanism to derive the version.")
    }
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
