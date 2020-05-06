import * as core from '@actions/core'
// import * as github from '@actions/github'
// import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
// import os from 'os'
import toml from 'toml'
import fs from 'fs'
import path from 'path'

interface Speller {
    filename: string
    name_win?: string
}

interface Manifest {
    package: {
        name: string,
        human_name: string,
        version: string,
        uuid_win: string,
        uuid_LO: string,
        uuid_win_mso: string,
    },
    spellers: Record<string, Speller>
}

function divvunConfigDir() {
    const runner = process.env['RUNNER_WORKSPACE']
    if (!runner)
        throw new Error('no RUNNER_WORKSPACE set');
    return path.resolve(runner, "divvun-ci-config")
}

async function getDivvunEnv(name: string) {
    let output = ""
    const options = {
        cwd: divvunConfigDir(),
        listeners: {
            stdout: (data: Buffer) => {
                output += data.toString();
            },
            stderr: (data: Buffer) => {
                console.log(data.toString())
            }
        }
    }

    await exec.exec("bash", ["-c", `source ./enc/env.sh && echo $${name}`], options)
    return output.trim()
}

async function run() {
    try {
        const manifestPath = core.getInput('manifest');
        const manifest = toml.parse(fs.readFileSync(manifestPath).toString()) as Manifest
        console.log(manifest)

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

        console.log(divvunConfigDir())

        if (process.platform == "darwin") {
            console.log(process.env)
            const args = [
                "-R", "-o", "output", "-t", "osx",
                "-H", manifest.package.human_name,
                "-V", manifest.package.version,
                "-a", "Developer ID Application: The University of Tromso (2K5J2584NX)",
                "-i", "Developer ID Installer: The University of Tromso (2K5J2584NX)",
                "-n", await getDivvunEnv("DEVELOPER_ACCOUNT"),
                "-k", await getDivvunEnv("DEVELOPER_PASSWORD_CHAIN_ITEM"),
                "speller",
                "-f", manifest.package.name,
            ].concat(spellerArgs)

            console.log(args)

            const exit = await exec.exec("divvun-bundler", args, {
                env: {
                    ...process.env,
                    "RUST_LOG": "info"
                }
            })
            const outputFile = `output/${manifest.package.name}-${manifest.package.version}.pkg`

            if (exit != 0 || !fs.existsSync(outputFile)) {
                throw new Error("divvun-bundler failed");
            }
            core.setOutput("installer", outputFile)
        } else if (process.platform === "win32") {
            const args = ["-R", "-t", "win", "-o", "output",
                "--uuid", manifest.package.uuid_win,
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
                    "SIGN_PFX_PASSWORD": await getDivvunEnv("SIGN_PFX_PASSWORD")
                }
            })

            const outputFile = `output/${manifest.package.name}-${manifest.package.version}.exe`

            if (exit != 0 || !fs.existsSync(outputFile)) {
                throw new Error("divvun-bundler failed");
            }

            const args_mso = ["-R", "-t", "win", "-o", "output",
                "--uuid", manifest.package.uuid_win_mso,
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
                    "RUST_LOG": "info",
                    "SIGN_PFX_PASSWORD": await getDivvunEnv("SIGN_PFX_PASSWORD")
                }
            })

            const outputFileMso = `output/${manifest.package.name}-mso-${manifest.package.version}.exe`

            if (exitMso != 0 || !fs.existsSync(outputFileMso)) {
                throw new Error("divvun-bundler failed");
            }

            core.setOutput("installer", outputFile)
            core.setOutput("installer_mso", outputFileMso)
        } else {
            throw new Error(`Unsupported platform ${process.platform}`)
        }


    }
    catch (error) {
        core.setFailed(error.message);
    }
}

run()