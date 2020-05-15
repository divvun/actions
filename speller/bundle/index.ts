import * as core from '@actions/core'
// import * as github from '@actions/github'
// import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import path from 'path'
import toml from 'toml'
import fs from 'fs'
import { divvunConfigDir, loadEnv } from '../../shared'
import { Manifest, BundleType } from '../manifest'
import YAML from 'yaml'

async function bundleEnv(env: any) {
    return {
        ...process.env,
        "RUST_LOG": "info",
        "SIGN_PFX_PASSWORD": env.windows.pfxPassword,
    }
}

async function bundleSpeller(manifest: Manifest, bundleType: BundleType) {
    const env = loadEnv()

    const isWindows = process.platform === 'win32'
    const spellerArgs = []
    const spellerMsoArgs = []
    for (const spellerName in manifest.spellers) {
        const speller = manifest.spellers[spellerName]
        const realSpellerName = (isWindows && speller.name_win) || spellerName
        spellerArgs.push("-l")
        spellerArgs.push(realSpellerName)
        spellerArgs.push("-z")
        spellerArgs.push(speller.filename)
        spellerMsoArgs.push("-l")
        spellerMsoArgs.push(realSpellerName)
    }

    if (bundleType == "speller_macos") {
        console.log(process.env)
        const args = [
            "-R", "-o", "output", "-t", "osx",
            "-H", manifest.package.human_name,
            "-V", manifest.package.version,
            "-a", "Developer ID Application: The University of Tromso (2K5J2584NX)",
            "-i", "Developer ID Installer: The University of Tromso (2K5J2584NX)",
            "-n", env.macos.developerAccount,
            "-k", env.macos.passwordChainItem,
            "speller",
            "-f", manifest.package.name,
        ].concat(spellerArgs)

        const exit = await exec.exec("divvun-bundler", args, {
            env: await bundleEnv(env)
        })
        const outputFile = `output/${manifest.package.name}-${manifest.package.version}.pkg`

        if (exit != 0 || !fs.existsSync(outputFile)) {
            throw new Error("divvun-bundler failed");
        }

        return path.resolve(outputFile)
    } else if (bundleType == "speller_win") {
        const args = ["-R", "-t", "win", "-o", "output",
            "--uuid", manifest.bundles[bundleType].uuid!,
            "-H", manifest.package.human_name,
            "-V", manifest.package.version,
            "-c", `${divvunConfigDir()}\\enc\\creds\\windows\\divvun.pfx`,
            "speller",
            "-f", manifest.package.name
        ].concat(spellerArgs)

        const exit = await exec.exec("divvun-bundler.exe", args, {
            env: await bundleEnv(env)
        })

        const outputFile = `output/${manifest.package.name}-${manifest.package.version}.exe`

        if (exit != 0 || !fs.existsSync(outputFile)) {
            throw new Error("divvun-bundler failed");
        }

        return path.resolve(outputFile)
    } else if (bundleType == "speller_win_mso") {
        const args_mso = ["-R", "-t", "win", "-o", "output",
            "--uuid", manifest.bundles[bundleType].uuid!,
            "-H", `${manifest.package.human_name} MSOffice`,
            "-V", manifest.package.version,
            "-c", `${divvunConfigDir()}\\enc\\creds\\windows\\divvun.pfx`,
            "speller_mso",
            "-f", manifest.package.name,
            "--reg", await io.which("win-reg-tool.exe")
        ].concat(spellerMsoArgs)

        const exitMso = await exec.exec("divvun-bundler.exe", args_mso, {
            env: await bundleEnv(env)
        })

        const outputFileMso = `output/${manifest.package.name}-mso-${manifest.package.version}.exe`

        if (exitMso != 0 || !fs.existsSync(outputFileMso)) {
            throw new Error("divvun-bundler failed");
        }

        return path.resolve(outputFileMso)
    } else if (bundleType == "speller_mobile") {
        const files = []
        const tarDir = path.resolve("_tar")
        console.log(tarDir)
        await io.mkdirP(tarDir)
        // Convert zhfsts
        for (const spellerName in manifest.spellers) {
            const speller = manifest.spellers[spellerName]
            const spellerTargetFileName = `${spellerName}.zhfst`
            const spellerNewFileName = `${spellerName}.bhfst`
            await io.cp(speller.filename, path.join(tarDir, spellerTargetFileName))
            // To debug failures of thfst-tools, list contents of the zhfst
            await exec.exec("unzip", ["-vl", spellerTargetFileName], { cwd: tarDir })
            const exit = await exec.exec("thfst-tools", ["zhfst-to-bhfst", spellerTargetFileName], {
                cwd: tarDir
            })
            if (exit != 0) {
                throw new Error(`Failed to convert ${spellerName}`)
            }
            files.push(spellerNewFileName)
        }

        const outputFile = path.resolve(tarDir, `${manifest.package.name}-${manifest.package.version}.txz`)
        // Archive
        const exit = await exec.exec("tar", ["cJf", outputFile].concat(files), { cwd: tarDir })
        if (exit != 0) {
            throw new Error("tar failed")
        }

        return path.resolve(outputFile)
    }
}

async function consolidateLayouts(manifest: Manifest) {
    if (!manifest.consolidated)
        throw new Error("No consolidated layout sources defined")

    const kbdgenPackagePath = path.resolve(`${manifest.package.name}.kbdgen`)

    await io.mkdirP("_kbdgit")
    for (const kbdgenPackageName in manifest.consolidated) {
        const layouts = manifest.consolidated[kbdgenPackageName]
        const tempDir = path.resolve("_kbdgit", kbdgenPackageName)

        const exit = await exec.exec("git", [
            "clone",
            "--depth=1", "--branch", layouts.branch || "master", "--single-branch",
            layouts.git, tempDir
        ])

        if (exit != 0)
            throw new Error("git clone failed")

        for (const layout of layouts.layouts) {
            console.log(`copy layout ${layout}`)
            await io.mkdirP(path.join(kbdgenPackagePath, "layouts"))
            await io.cp(
                path.join(tempDir, "layouts", `${layout}.yaml`),
                path.join(kbdgenPackagePath, "layouts", `${layout}.yaml`)
            )
        }

        await io.rmRF(tempDir)
    }
}

async function bundleKeyboard(manifest: Manifest, bundleType: BundleType) {
    console.log("keyboard", bundleType)
    const kbdgenPackagePath = `${manifest.package.name}.kbdgen`
    if (bundleType == "keyboard_android") {
        console.log("android", bundleType)
        if (!process.env.ANDROID_NDK_HOME)
            throw new Error("ANDROID_NDK_HOME not set")

        await consolidateLayouts(manifest)
        const androidTarget = YAML.parse(path.resolve(kbdgenPackagePath, "targets", "android.yaml"))
        const version = androidTarget["version"]
        // const keyAlias = androidTarget["keyAlias"]
        const exit = await exec.exec("kbdgen", [
            "--logging", "debug",
            "build",
            "--github-username", await getDivvunEnv("GITHUB_USERNAME"),
            "--github-token", await getDivvunEnv("GITHUB_TOKEN"),
            "android", "-R", "--ci", "-o", "output",
            kbdgenPackagePath
        ], {
            env: {
                ...process.env,
                "NDK_HOME": process.env.ANDROID_NDK_HOME,
            }
        })

        if (exit != 0) {
            throw new Error("kbdgen failed")
        }

        return path.resolve(`output/${manifest.package.name}-${version}_release.apk`)
    }
}

async function run() {
    try {
        const manifestPath = core.getInput('manifest');
        const manifest = toml.parse(fs.readFileSync(manifestPath).toString()) as Manifest
        // console.log(manifest)
        const bundleType = core.getInput('bundleType') as BundleType;

        console.log(bundleType)

        const bundle = manifest.bundles[bundleType]
        if (!bundle)
            throw new Error(`No such bundle ${bundleType}`)

        const spellerOutput = bundleSpeller(manifest, bundleType) || bundleKeyboard(manifest, bundleType);
        console.log("output", spellerOutput)
        if (spellerOutput) {
            core.setOutput("bundle", spellerOutput)
        } else {
            throw new Error(`Unsupported bundleType ${bundleType}`)
        }


    }
    catch (error) {
        core.setFailed(error.message);
    }
}

run()