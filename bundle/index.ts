import * as core from '@actions/core'
// import * as github from '@actions/github'
// import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
// import * as io from '@actions/io'
// import * as os from 'os'
import toml from 'toml'
import fs from 'fs'

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


async function run() {
    try {
        const manifestPath = core.getInput('manifest');
        console.log(manifestPath)
        const manifest = toml.parse(fs.readFileSync(manifestPath).toString()) as Manifest
        console.log(manifest)

        const args = [
            "-R", "-o output", "-t osx",
            "-H", manifest.package.human_name,
            "-V", manifest.package.version,
            "-a", "Developer ID Application: The University of Tromso (2K5J2584NX)",
            "-i", "Developer ID Installer: The University of Tromso (2K5J2584NX)",
            "speller",
            "-f", manifest.package.name,
        ]

        for (const spellerName in manifest.spellers) {
            console.log(`speller ${spellerName}`)
            const speller = manifest.spellers[spellerName]
            args.push("-l")
            args.push(spellerName)
            args.push("-z")
            args.push(speller.filename)
        }

        await exec.exec("divvun-bundler", args)

        core.setOutput("installer", `output/${manifest.package.name}-${manifest.package.version}.pkg`)
    }
    catch (error) {
        core.setFailed(error.message);
    }
}

run()