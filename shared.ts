import * as exec from '@actions/exec'
import * as github from '@actions/github'
import path from 'path'
import fs from 'fs'
import YAML from 'yaml'


export function divvunConfigDir() {
    const runner = process.env['RUNNER_WORKSPACE']
    if (!runner)
        throw new Error('no RUNNER_WORKSPACE set');
    return path.resolve(runner, "divvun-ci-config")
}

export function shouldDeploy() {
    const isMaster = github.context.ref == 'refs/heads/master'

    return isMaster
}

export function loadEnv() {
    const p = path.resolve(divvunConfigDir(), "enc", "env.json")
    const s = fs.readFileSync(p, "utf8")
    return JSON.parse(s)
}

export function loadKbdgenTarget(kbdgenPath: string, target: string) {
    return YAML.parse(fs.readFileSync(path.resolve(kbdgenPath, "targets", `${target}.yaml`), 'utf8'))
}

export function saveKbdgenTarget(kbdgenPath: string, target: string, body: any) {
    fs.writeFileSync(path.resolve(kbdgenPath, "targets", `${target}.yaml`), YAML.stringify(body), 'utf8')
}