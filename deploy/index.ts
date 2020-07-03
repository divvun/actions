import * as core from '@actions/core'
import fs from "fs"
import path from "path"

import {
    PahkatUploader,
    RebootSpec,
    MacOSPackageTarget,
    validateProductCode,
    WindowsExecutableKind
} from '../shared'

enum PackageType {
    MacOSPackage = "MacOSPackage",
    WindowsExecutable = "WindowsExecutable",
    TarballPackage = "TarballPackage",
}

function getPlatformAndType(): { packageType: PackageType, platform: string } {
    let platform = core.getInput('platform') || null
    const givenType = core.getInput('type') || null

    core.debug(`Platform: '${platform}', Type: '${givenType}'`)

    if (givenType == null) {
        if (platform == null) {
            throw new Error("Either platform or type must be set.")
        }

        if (platform === "macos") {
            return {
                packageType: PackageType.MacOSPackage,
                platform
            }
        } else if (platform === "windows") {
            return {
                packageType: PackageType.WindowsExecutable,
                platform
            }
        } else {
            return {
                packageType: PackageType.TarballPackage,
                platform
            }
        }
    }

    if (platform == null) {
        switch (givenType) {
            case PackageType.MacOSPackage:
                platform = "macos"
                break
            case PackageType.WindowsExecutable:
                platform = "windows"
                break
            case PackageType.TarballPackage:
                throw new Error("Cannot detect platform from only a package type of TarballPackage")
        }
    }

    if (platform != null) {
        switch (givenType) {
            case PackageType.MacOSPackage:
            case PackageType.WindowsExecutable:
            case PackageType.TarballPackage:
                return { packageType: givenType, platform }
            default:
                throw new Error(`Unhandled package type: '${givenType}'`)
        }
    } else {
        throw new Error(`Platform was null, should be unreachable.`)
    }
}

async function run() {
    const packageId = core.getInput('package-id', { required: true })
    const { packageType, platform } = getPlatformAndType()
    const payloadPath = core.getInput('payload-path', { required: true })
    const arch = core.getInput('arch') || null
    const channel = core.getInput('channel') || null
    const pahkatRepo = core.getInput('repo', { required: true })

    const url = `${pahkatRepo}packages/${packageId}`

    let version = core.getInput('version', { required: true })
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
    } else if (packageType === PackageType.WindowsExecutable) {
        let productCode = core.getInput("windows-product-code", { required: true })
        const kind = core.getInput("windows-kind")
        const rawReqReboot = core.getInput('windows-requires-reboot')
        const requiresReboot: RebootSpec[] = rawReqReboot
            ? rawReqReboot.split(',').map(x => x.trim()) as RebootSpec[]
            : []

        switch (kind) {
            case WindowsExecutableKind.Inno:
            case WindowsExecutableKind.Nsis:
            case WindowsExecutableKind.Msi:
                productCode = validateProductCode(kind, productCode)
                break;
            case null:
                core.debug("No Windows kind provided, not validating product code.")
                break;
            default:
                throw new Error("Unhandled Windows executable kind: " + kind)
        }

        const data = await PahkatUploader.payload.windowsExecutable(
            1,
            1, 
            kind,
            productCode,
            requiresReboot,
            payloadPath)
        fs.writeFileSync("./metadata.toml", data, "utf8")
    } else if (packageType === PackageType.TarballPackage) {
        const data = await PahkatUploader.payload.tarballPackage(1, 1, payloadPath)
        fs.writeFileSync("./metadata.toml", data, "utf8")
    } else {
        throw new Error(`Unhandled package type: '${packageType}'`)
    }

    const ext = path.extname(payloadPath)
    const pathItems = [packageId, version, platform]

    if (arch != null) {
        pathItems.push(arch)
    }

    const newPath = path.join(path.dirname(payloadPath), `${pathItems.join("_")}${ext}`)
    
    core.debug(`Renaming from ${payloadPath} to ${newPath}`)
    fs.renameSync(payloadPath, newPath)

    await PahkatUploader.upload(newPath, "./metadata.toml", {
        url,
        version,
        arch,
        platform,
        channel,
    })
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
