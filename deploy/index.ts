import * as core from '@actions/core'
import fs from "fs"
import path from "path"

import { shouldDeploy, PahkatUploader, versionAsNightly, RebootSpec, MacOSPackageTarget } from '../shared'

enum PackageType {
    MacOSPackage = "MacOSPackage",
    WindowsExecutable = "WindowsExecutable",
    TarballPackage = "TarballPackage",
}

function getPackageType(platform: string): PackageType {
    const givenType = core.getInput('type')

    if (givenType == null) {
        if (platform === "macos") {
            return PackageType.MacOSPackage
        } else if (platform === "windows") {
            return PackageType.WindowsExecutable
        } else {
            return PackageType.TarballPackage
        }
    }

    switch (givenType) {
        case PackageType.MacOSPackage:
        case PackageType.WindowsExecutable:
        case PackageType.TarballPackage:
            return givenType
        default:
            throw new Error("Unhandled package type: " + givenType)
    }

}

async function run() {
    const packageId = core.getInput('package-id', { required: true })
    const platform = core.getInput('platform', { required: true })
    const packageType = getPackageType(platform)
    const payloadPath = core.getInput('payload-path', { required: true })
    const channel = core.getInput('channel') || null
    const pahkatRepo = core.getInput('repo', { required: true })

    const url = `${pahkatRepo}packages/${packageId}`

    let version = core.getInput('version', { required: true })

    if (channel === "nightly") {
        core.debug("Generating nightly-suffixed version due to channel 'nightly'")
        version = await versionAsNightly(version)
    }

    core.debug("Version: " + version)

    if (packageType === PackageType.MacOSPackage) {
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
        throw new Error("Unhandled package type: " + packageType)
    }

    const isDeploying = shouldDeploy() || core.getInput('force-deploy');

    if (!isDeploying) {
        core.warning("Not deploying; ending.")
        return
    }

    const ext = path.extname(payloadPath)
    const newPath = path.join(path.dirname(payloadPath), `${packageId}_${version}_${platform}${ext}`)
    core.debug(`Renaming from ${payloadPath} to ${newPath}`)
    fs.renameSync(payloadPath, newPath)

    await PahkatUploader.upload(newPath, "./metadata.toml", {
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
