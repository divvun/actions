import * as exec from '@actions/exec'
import path from 'path'
import * as github from '@actions/github'

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


export function shouldDeploy() {
    const isMaster = github.context.ref == 'refs/heads/master'

    return isMaster
}