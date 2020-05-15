import * as exec from '@actions/exec'
import * as github from '@actions/github'
import path from 'path'
import fs from 'fs'


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

function loadEnv() {
    const p = path.resolve(divvunConfigDir(), "env.json")
    const s = fs.readFileSync(p, "utf8")
    return JSON.parse(s)
}

export const env = Object.freeze(loadEnv())