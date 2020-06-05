import * as core from '@actions/core'
import fs from "fs"

import { shouldDeploy, PahkatUploader, versionAsNightly, RebootSpec, MacOSPackageTarget } from '../shared'

async function run() {
    const packageId = core.getInput('package-id', { required: true })
    const platform = core.getInput('platform', { required: true })
    const payloadPath = core.getInput('payload-path', { required: true })
    const channel = core.getInput('channel') || null
    const pahkatRepo = core.getInput('repo', { required: true })

    const url = `${pahkatRepo}packages/${packageId}`

    let version = core.getInput('version', { required: true })

    if (channel === "nightly") {
        version = await versionAsNightly(version)
    }

    core.debug("Version: " + version)

    if (platform === "macos") {
        const pkgId = core.getInput('macos-pkg-id', { required: true })
        const rawReqReboot = core.getInput('macos-requires-reboot')
        const rawTargets = core.getInput('macos-targets')

        const requiresReboot: RebootSpec[] = rawReqReboot
            ? rawReqReboot.split(',').map(x => x.trim()) as RebootSpec[]
            : []
        const targets = rawTargets
            ? rawTargets.split(',').map(x => x.trim()) as MacOSPackageTarget[]
            : []

        const data = await PahkatUploader.payload.macosPackage(1, 1, pkgId, requiresReboot, targets, payloadPath)
        fs.writeFileSync("./metadata.toml", data, "utf8")
    } else {
        throw new Error("Unknown platform: " + platform)
    }

    const isDeploying = shouldDeploy() || core.getInput('force-deploy');

    if (!isDeploying) {
        core.warning("Not deploying; ending.")
        return
    }

    await PahkatUploader.upload(payloadPath, "./metadata.toml", {
        url,
        version,
        platform,
        channel,
    })
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
