import * as core from '@actions/core'
import fs from "fs"

import toml from "toml"
import { versionAsNightly, isCurrentBranch, nonUndefinedProxy, isMatchingTag } from '../shared'
import { SpellerManifest } from '../speller/manifest'

function getCargoToml() {
    const cargo = core.getInput("cargo") || null

    if (cargo == null) {
        return null
    }

    if (cargo === "true") {
        return nonUndefinedProxy(toml.parse(fs.readFileSync("./Cargo.toml", "utf8")))
    }

    return nonUndefinedProxy(toml.parse(fs.readFileSync(cargo, "utf8")))
}

function getSpellerManifestToml(): SpellerManifest | null {
    const manifest = core.getInput("speller-manifest") || null

    if (manifest == null) {
        return null
    }

    if (manifest === "true") {
        return nonUndefinedProxy(toml.parse(fs.readFileSync("./manifest.toml", "utf8")))
    }

    return nonUndefinedProxy(toml.parse(fs.readFileSync(manifest, "utf8")))
}

// Taken straight from semver.org, with added 'v'
const SEMVER_TAG_RE = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

function deriveNightly(): boolean {
    return !isMatchingTag(SEMVER_TAG_RE)
}

async function run() {
    const isNightly = deriveNightly()
    const cargoToml = getCargoToml()
    const spellerManifest = getSpellerManifestToml()
    const csharp = core.getInput("csharp") || null

    let version 

    if (cargoToml != null) {
        core.debug("Getting version from TOML")
        version = cargoToml.package.version
    } else if (csharp != null) {
        core.debug("Getting version from GitVersioning C#")
        version = process.env.GitBuildVersionSimple
    } else if (spellerManifest != null) {
        core.debug("Getting version from speller manifest")
        version = spellerManifest.version
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
