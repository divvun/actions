import { exec } from '@actions/exec'
import * as core from '@actions/core'
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

const env = {
    ...process.env,
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    DEBIAN_FRONTEND: "noninteractive",
    DEBCONF_NONINTERACTIVE_SEEN: "true"
}

function assertExit0(code: number) {
    if (code !== 0) {
        core.setFailed(`Process exited with exit code ${code}.`)
    }
}

export class Apt {
    static async update() {
        assertExit0(await exec("sudo", ["apt-get", "-qy", "update"], { env }))
    }

    static async install(packages: string[]) {
        assertExit0(await exec("sudo", ["apt-get", "install", "-qfy", ...packages], { env }))
    }
}

export class Pip {
    static async install(packages: string[]) {
        assertExit0(await exec("sudo", ["pip3", "install", ...packages], { env }))
    }
}

export class Bash {
    static async runScript(script: string, args: {
        sudo?: boolean,
        cwd?: string,
    } = {}) {
        if (args.sudo) {
            assertExit0(await exec("sudo", ["bash", "-c", script], { env, cwd: args.cwd }))
        } else {
            assertExit0(await exec("bash", ["-c", script], { env, cwd: args.cwd }))
        }
    }
}

// Since some state remains after the builds, don't grow known_hosts infinitely
const CLEAR_KNOWN_HOSTS_SH = `\
mkdir -pv ~/.ssh
ssh-keyscan github.com | tee -a ~/.ssh/known_hosts
cat ~/.ssh/known_hosts | sort | uniq > ~/.ssh/known_hosts.new
mv ~/.ssh/known_hosts.new ~/.ssh/known_hosts
`

export class Ssh {
    static async cleanKnownHosts() {
        await Bash.runScript(CLEAR_KNOWN_HOSTS_SH)
    }
}

const PROJECTJJ_NIGHTLY_SH = `\
wget -q https://apertium.projectjj.com/apt/install-nightly.sh -O install-nightly.sh && bash install-nightly.sh
`

export class ProjectJJ {
    static async addNightlyToApt() {
        await Bash.runScript(PROJECTJJ_NIGHTLY_SH, { sudo: true })
    }
}

