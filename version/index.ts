import * as core from '@actions/core'
import fs from "fs"
import path from "path"

import toml from "toml"
import { versionAsNightly, nonUndefinedProxy, Bash, isMatchingTag } from '../shared'
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

async function getXcodeMarketingVersion() {
    const input = core.getInput("xcode") || null
    let cwd

    if (input != null && input !== "true") {
        cwd = input.trim()
    }
    // Xcode is the worst and I want out of this dastardly life.
    const [out] = await Bash.runScript(`xcodebuild -showBuildSettings | grep -i 'MARKETING_VERSION' | sed 's/ *MARKETING_VERSION = //'`, { cwd })
    return out.trim()
}

// Taken straight from semver.org, with added 'v'
const SEMVER_TAG_RE = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

function deriveNightly(): boolean {
    return !isMatchingTag(SEMVER_TAG_RE)
}

function getPlistPath() {
    const plistPath = core.getInput("plist") || null

    if (plistPath == null) {
        return null
    }

    return path.resolve(plistPath)
}

async function run() {
    const isXcode = core.getInput("xcode") || null
    const isNightly = deriveNightly()
    const cargoToml = getCargoToml()
    const spellerManifest = getSpellerManifestToml()
    const plistPath = getPlistPath()
    const csharp = core.getInput("csharp") || null
    const stableChannel = core.getInput("stable-channel") || null

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
    } else if (plistPath != null) {
        core.debug('Getting version from plist')
        const result = (await Bash.runScript(`/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" "${plistPath}"`)).join("").trim()
        if (result === "") {
            throw new Error("No version found in plist")
        }
        version = result
    } else if (isXcode) {
        version = await getXcodeMarketingVersion()
    } else {
        throw new Error("Did not find a suitable mechanism to derive the version.")
    }

    if (version == null || version.trim() === "") {
        throw new Error("Did not find any version.")
    }

    if (isNightly) {
        core.debug("Generating nightly version")
        version = await versionAsNightly(version)

        core.setOutput("channel", "nightly")
    } else if (stableChannel != null) {
        core.setOutput("channel", stableChannel)
    }

    core.debug("Setting version to: " + version)
    core.setOutput("version", version)
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
