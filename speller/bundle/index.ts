import * as core from '@actions/core'
// import * as github from '@actions/github'
// import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import path from 'path'
import toml from 'toml'
import fs from 'fs'
import { divvunConfigDir, getDivvunEnv } from '../../shared'
import { Manifest, BundleType } from '../manifest'

async function run() {
    try {
        const manifestPath = core.getInput('manifest');
        const manifest = toml.parse(fs.readFileSync(manifestPath).toString()) as Manifest
        console.log(manifest)
        const bundleType = core.getInput('bundleType') as BundleType;

        const bundle = manifest.bundles[bundleType]
        if (!bundle)
            throw new Error(`No such bundle ${bundleType}`)

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
                "-n", await getDivvunEnv("MACOS_DEVELOPER_ACCOUNT"),
                "-k", await getDivvunEnv("MACOS_DEVELOPER_PASSWORD_CHAIN_ITEM"),
                "speller",
                "-f", manifest.package.name,
            ].concat(spellerArgs)

            const exit = await exec.exec("divvun-bundler", args, {
                env: {
                    ...process.env,
                    "RUST_LOG": "info",
                    "SIGN_PFX_PASSWORD": await getDivvunEnv("SIGN_PFX_PASSWORD"),
                }
            })
            const outputFile = `output/${manifest.package.name}-${manifest.package.version}.pkg`

            if (exit != 0 || !fs.existsSync(outputFile)) {
                throw new Error("divvun-bundler failed");
            }

            core.setOutput("bundle", path.resolve(outputFile))
        } else if (bundleType == "speller_win") {
            const args = ["-R", "-t", "win", "-o", "output",
                "--uuid", bundle.uuid!,
                "-H", manifest.package.human_name,
                "-V", manifest.package.version,
                "-c", `${divvunConfigDir()}\\enc\\creds\\windows\\divvun.pfx`,
                "speller",
                "-f", manifest.package.name
            ].concat(spellerArgs)

            const exit = await exec.exec("divvun-bundler.exe", args, {
                env: {
                    ...process.env,
                    "RUST_LOG": "info",
                    "SIGN_PFX_PASSWORD": await getDivvunEnv("SIGN_PFX_PASSWORD"),
                }
            })

            const outputFile = `output/${manifest.package.name}-${manifest.package.version}.exe`

            if (exit != 0 || !fs.existsSync(outputFile)) {
                throw new Error("divvun-bundler failed");
            }

            core.setOutput("bundle", path.resolve(outputFile))
        } else if (bundleType == "speller_win_mso") {
            const args_mso = ["-R", "-t", "win", "-o", "output",
                "--uuid", bundle.uuid!,
                "-H", `${manifest.package.human_name} MSOffice`,
                "-V", manifest.package.version,
                "-c", `${divvunConfigDir()}\\enc\\creds\\windows\\divvun.pfx`,
                "speller_mso",
                "-f", manifest.package.name,
                "--reg", await io.which("win-reg-tool.exe")
            ].concat(spellerMsoArgs)

            const exitMso = await exec.exec("divvun-bundler.exe", args_mso, {
                env: {
                    ...process.env,
                    "RUST_LOG": "info"
                }
            })

            const outputFileMso = `output/${manifest.package.name}-mso-${manifest.package.version}.exe`

            if (exitMso != 0 || !fs.existsSync(outputFileMso)) {
                throw new Error("divvun-bundler failed");
            }

            core.setOutput("bundle", path.resolve(outputFileMso))
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
            console.log(outputFile)
            // Archive
            const exit = await exec.exec("tar", ["cJf", outputFile].concat(files), { cwd: tarDir })
            if (exit != 0) {
                throw new Error("tar failed")
            }

            core.setOutput("bundle", path.resolve(outputFile))
        } else {
            throw new Error(`Unsupported bundleType ${bundleType}`)
        }


    }
    catch (error) {
        core.setFailed(error.message);
    }
}

run()