import * as exec from '@actions/exec'
import path from 'path'

export interface Speller {
    filename: string
    name_win?: string
}

export type BundleType = "speller_win" | "speller_win_mso" | "speller_macos" | "speller_mobile"
export interface Bundle {
    package: string,
    platform: "windows" | "macos" | "mobile",
    uuid?: string,
    repo: string,
}

export interface Manifest {
    package: {
        name: string,
        human_name: string,
        version: string,
    },
    spellers: Record<string, Speller>,
    bundles: Record<BundleType, Bundle>
}


export function divvunConfigDir() {
    const runner = process.env['RUNNER_WORKSPACE']
    if (!runner)
        throw new Error('no RUNNER_WORKSPACE set');
    return path.resolve(runner, "divvun-ci-config")
}

export async function getDivvunEnv(name: string) {
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