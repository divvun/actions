import { exec } from '@actions/exec'
import * as core from '@actions/core'
import * as github from '@actions/github'
import * as tc from '@actions/tool-cache'
import * as io from "@actions/io"
import * as glob from "@actions/glob"
import path from 'path'
import fs from 'fs'
import YAML from 'yaml'
import * as tmp from 'tmp'
import { Octokit } from "@octokit/action"
import crypto from "crypto"

export const RFC3161_URL = "http://timestamp.sectigo.com"

export function tmpDir() {
    const dir = process.env["RUNNER_TEMP"]
    if (dir == null || dir.trim() == '') {
        throw new Error("RUNNER_TEMP was not defined")
    }
    return dir
}

export function divvunConfigDir() {
    return path.resolve(tmpDir(), "divvun-ci-config")
}

export function shouldDeploy() {
    return github.context.ref === 'refs/heads/master'
}

// Generates a random string of 64 characters in length (48 bytes converted to base64)
export function randomString64() {
    // Replace slashes just in case bad things in the terminal
    return crypto.randomBytes(48).toString("base64")
}

export function randomHexBytes(count: number) {
    return crypto.randomBytes(count).toString("hex")
}

export const DIVVUN_PFX = `${divvunConfigDir()}\\enc\\creds\\windows\\divvun.pfx`

let loadedSecrets: any = null

export function secrets() {
    if (loadedSecrets != null) {
        return loadedSecrets
    }

    const p = path.resolve(divvunConfigDir(), "enc", "env.json")
    const s = fs.readFileSync(p, "utf8")
    const secrets = JSON.parse(s)

    // Mask ALL secrets
    function walk(obj: any) {
        if (obj !== null && typeof obj == "object") {
            for (const value of Object.values(obj)) {
                walk(value)
            }
        } else {
            core.setSecret(obj)
        }
    }
    walk(secrets)

    loadedSecrets = nonUndefinedProxy(secrets, true)
    return loadedSecrets
}

function env() {
    let langs = {
        LANG: "C.UTF-8",
        LC_ALL: "C.UTF-8",
    }

    if (process.platform === "darwin") {
        langs.LANG = "en_US.UTF-8"
        langs.LC_ALL = "en_US.UTF-8"
    }

    return {
        ...process.env,
        ...langs,
        DEBIAN_FRONTEND: "noninteractive",
        DEBCONF_NONINTERACTIVE_SEEN: "true",
        PYTHONUTF8: "1",
    }
}

function assertExit0(code: number) {
    if (code !== 0) {
        core.setFailed(`Process exited with exit code ${code}.`)
    }
}

export class Apt {
    static async update(requiresSudo: boolean) {
        if (requiresSudo) {
            assertExit0(await exec("sudo", ["apt-get", "-qy", "update"], { env: env() }))
        } else {
            assertExit0(await exec("apt-get", ["-qy", "update"], { env: env() }))
        }
    }

    static async install(packages: string[], requiresSudo: boolean) {
        if (requiresSudo) {
            assertExit0(await exec("sudo", ["apt-get", "install", "-qfy", ...packages], { env: env() }))
        } else {
            assertExit0(await exec("apt-get", ["install", "-qfy", ...packages], { env: env() }))

        }
    }
}

export class Pip {
    static async install(packages: string[], requiresSudo: boolean) {
        if (requiresSudo) {
            assertExit0(await exec("sudo", ["pip3", "install", ...packages], { env: env() }))
        } else {
            assertExit0(await exec("pip3", ["install", ...packages], { env: env() }))
        }
    }
}

export class Powershell {
    static async runScript(script: string, opts: {
        cwd?: string,
        env?: { [key: string]: string }
    } = {}) {
        const thisEnv = Object.assign({}, env(), opts.env)

        const out: string[] = []
        const err: string[] = []

        const listeners = {
            stdout: (data: Buffer) => {
                out.push(data.toString())
            },
            stderr: (data: Buffer) => {
                err.push(data.toString())
            }
        }

        assertExit0(await exec("pwsh", ["-c", script], { env: thisEnv, cwd: opts.cwd, listeners }))
        return [out.join(""), err.join("")]
    }
}

export class DefaultShell {
    static async runScript(script: string, args: {
        sudo?: boolean,
        cwd?: string,
        env?: { [key: string]: string }
    } = {}) {
        if (process.platform === "win32") {
            return await Powershell.runScript(script, args)
        } else {
            return await Bash.runScript(script, args)
        }
    }
}

export class Bash {
    static async runScript(script: string, args: {
        sudo?: boolean,
        cwd?: string,
        env?: { [key: string]: string }
    } = {}) {
        const thisEnv = Object.assign({}, env(), args.env)

        const out: string[] = []
        const err: string[] = []

        core.debug("PATH:")
        core.debug(process.env.PATH!)

        try {
            const paths = fs.readdirSync(path.join(PahkatPrefix.path, "pkg"))
            core.debug(`Paths in prefix: ${paths.join(", ")}`)
        } catch(e) {
            core.debug("Error getting pahkat prefix")
            core.debug(e)
        }

        const listeners = {
            stdout: (data: Buffer) => {
                out.push(data.toString())
            },
            stderr: (data: Buffer) => {
                err.push(data.toString())
            }
        }

        if (args.sudo) {
            assertExit0(await exec("sudo", ["bash", "-c", script], { env: thisEnv, cwd: args.cwd, listeners }))
        } else {
            assertExit0(await exec("bash", ["-c", script], { env: thisEnv, cwd: args.cwd, listeners }))
        }

        return [out.join(""), err.join("")]
    }
}

export class Tar {
    static URL_XZ_WINDOWS = "https://tukaani.org/xz/xz-5.2.5-windows.zip"

    static async bootstrap() {
        if (process.platform !== "win32") {
            return
        }

        const outputPath = path.join(tmpDir(), "xz", "bin_x86-64")
        if (fs.existsSync(path.join(outputPath, "xz.exe"))) {
            return
        }

        core.debug("Attempt to download xz tools")
        const xzToolsZip = await tc.downloadTool(Tar.URL_XZ_WINDOWS)
        await tc.extractZip(xzToolsZip, path.join(tmpDir(), "xz"))
        core.addPath(outputPath)
    }

    static async extractTxz(filePath: string, outputDir?: string) {
        const platform = process.platform

        if (platform === "linux") {
            return await tc.extractTar(filePath, outputDir || tmpDir(), "Jx")
        } else if (platform === "darwin") {
            return await tc.extractTar(filePath, outputDir || tmpDir())
        } else if (platform === "win32") {
            // Windows kinda can't deal with no xz.
            await Tar.bootstrap()

            // Now we unxz it
            core.debug("Attempt to unxz")
            await exec("xz", ["-d", filePath])

            core.debug("Attempted to extract tarball")
            return await tc.extractTar(`${path.dirname(filePath)}\\${path.basename(filePath, ".txz")}.tar`, outputDir || tmpDir())
        } else {
            throw new Error(`Unsupported platform: ${platform}`)
        }
    }

    static async createFlatTxz(paths: string[], outputPath: string) {
        const tmpDir = tmp.dirSync()
        const stagingDir = path.join(tmpDir.name, "staging")
        fs.mkdirSync(stagingDir)

        core.debug(`Created tmp dir: ${tmpDir.name}`)

        for (const p of paths) {
            core.debug(`Copying ${p} into ${stagingDir}`)
            await io.cp(p, stagingDir, { recursive: true })
        }

        core.debug(`Tarring`)
        await Bash.runScript(`tar cf ../file.tar *`, { cwd: stagingDir })

        core.debug("xz -9'ing")
        await Bash.runScript(`xz -9 ../file.tar`, { cwd: stagingDir })

        core.debug("Copying file.tar.xz to " + outputPath)
        await io.cp(path.join(tmpDir.name, "file.tar.xz"), outputPath)
    }
}

export enum RebootSpec { Install = "install", Uninstall = "uninstall",  Update = "update" }
export enum WindowsExecutableKind { Inno = "inno", Nsis = "nsis", Msi = "msi" }

export class PahkatPrefix {
    static URL_LINUX = "https://pahkat.uit.no/artifacts/pahkat-prefix-cli_0.1.0-nightly.20211019T150611Z_linux_x86_64.txz"
    static URL_MACOS = "https://pahkat.uit.no/artifacts/pahkat-prefix-cli_0.1.0-nightly.20211019T124649Z_macos_x86_64.txz"
    static URL_WINDOWS = "https://pahkat.uit.no/artifacts/pahkat-prefix-cli_0.1.0-nightly.20211019T150611Z_windows_i686.txz"

    static get path(): string {
        return path.join(tmpDir(), "pahkat-prefix")
    }

    static async bootstrap() {
        const platform = process.platform

        let txz
        if (platform === "linux") {
            txz = await tc.downloadTool(PahkatPrefix.URL_LINUX)
        } else if (platform === "darwin") {
            txz = await tc.downloadTool(PahkatPrefix.URL_MACOS)
        } else if (platform === "win32") {
            // Now we can download things
            txz = await tc.downloadTool(PahkatPrefix.URL_WINDOWS,
                path.join(tmpDir(), "pahkat-dl.txz"))
        } else {
            throw new Error(`Unsupported platform: ${platform}`)
        }

        // Extract the file
        const outputPath = await Tar.extractTxz(txz)
        const binPath = path.resolve(outputPath, "bin")

        console.log(`Bin path: ${binPath}, platform: ${process.platform}`)
        core.addPath(binPath)

        // Init the repo
        if (fs.existsSync(PahkatPrefix.path)) {
            core.debug(`${PahkatPrefix.path} exists; deleting first.`)
            fs.rmdirSync(PahkatPrefix.path, { recursive: true })
        }
        await DefaultShell.runScript(`pahkat-prefix init -c ${PahkatPrefix.path}`)
    }

    static async addRepo(url: string, channel?: string) {
        if (channel != null) {
            await DefaultShell.runScript(`pahkat-prefix config repo add -c ${PahkatPrefix.path} ${url} ${channel}`)
        } else {
            await DefaultShell.runScript(`pahkat-prefix config repo add -c ${PahkatPrefix.path} ${url}`)
        }
    }

    static async install(packages: string[]) {
        await DefaultShell.runScript(`pahkat-prefix install ${packages.join(" ")} -c ${PahkatPrefix.path}`)

        for (const pkg of packages) {
            core.addPath(path.join(PahkatPrefix.path, "pkg", pkg.split("@").shift()!, "bin"))
        }
    }
}

export enum MacOSPackageTarget {
    System = "system",
    User = "user"
}

export type ReleaseRequest = {
    version: string,
    platform: string,
    arch?: string,
    channel?: string,
    authors?: string[],
    license?: string,
    licenseUrl?: string,
    dependencies?: { [key: string]: string }
}

export class PahkatUploader {
    static ARTIFACTS_URL: string = "https://pahkat.uit.no/artifacts/"

    private static async run(args: string[]): Promise<string> {
        const sec = secrets()
        let output: string = ""

        core.debug("PATH:")
        core.debug(process.env.PATH!)

        let exe: string
        if (process.platform === "win32") {
            exe = "pahkat-uploader.exe"
        } else {
            exe = "pahkat-uploader"
        }

        assertExit0(await exec(exe, args, {
            env: Object.assign({}, env(), {
                PAHKAT_API_KEY: sec.pahkat.apiKey
            }),
            listeners: {
                stdout: (data: Buffer) => {
                    output += data.toString()
                }
            }
        }))
        return output
    }

    static async upload(artifactPath: string, artifactUrl: string, releaseManifestPath: string, repoUrl: string) {
        if (!fs.existsSync(releaseManifestPath)) {
            throw new Error(`Missing required payload manifest at path ${releaseManifestPath}`)
        }

        // Step 1: Use SVN to do the crimes.
        await Subversion.import(artifactPath, artifactUrl)

        // Step 2: Push the manifest to the server.
        const args = ["upload",
            "-u", repoUrl,
            "-P", releaseManifestPath,
        ]
        console.log(await PahkatUploader.run(args))

    }

    static releaseArgs(release: ReleaseRequest) {
        const args = [
            "release",
        ]

        if (release.authors) {
            args.push("--authors")
            for (const item of release.authors) {
                args.push(item)
            }
        }

        if (release.arch) {
            args.push("--arch")
            args.push(release.arch)
        }

        if (release.dependencies) {
            const deps = Object.entries(release.dependencies)
                .map(x => `${x[0]}::${x[1]}`)
                .join(",")

            args.push("-d")
            args.push(deps)
        }

        if (release.channel) {
            args.push("--channel")
            args.push(release.channel)
        }

        if (release.license) {
            args.push("-l")
            args.push(release.license)
        }

        if (release.licenseUrl) {
            args.push("--license-url")
            args.push(release.licenseUrl)
        }

        args.push("-p")
        args.push(release.platform)

        args.push("--version")
        args.push(release.version)

        return args
    }

    static release = {
        async windowsExecutable(
            release: ReleaseRequest,
            artifactUrl: string,
            installSize: number,
            size: number,
            kind: WindowsExecutableKind | null,
            productCode: string,
            requiresReboot: RebootSpec[],
        ): Promise<string> {
            const payloadArgs = [
                "windows-executable",
                "-i", (installSize | 0).toString(),
                "-s", (size | 0).toString(),
                "-p", productCode,
                "-u", artifactUrl
            ]

            if (kind != null) {
                payloadArgs.push("-k")
                payloadArgs.push(kind)
            }

            if (requiresReboot.length > 0) {
                payloadArgs.push("-r")
                payloadArgs.push(requiresReboot.join(","))
            }

            const releaseArgs = PahkatUploader.releaseArgs(release)
            return await PahkatUploader.run([...releaseArgs, ...payloadArgs])
        },

        async macosPackage(
            release: ReleaseRequest,
            artifactUrl: string,
            installSize: number,
            size: number,
            pkgId: string,
            requiresReboot: RebootSpec[],
            targets: MacOSPackageTarget[],
        ): Promise<string> {
            const payloadArgs = [
                "macos-package",
                "-i", (installSize | 0).toString(),
                "-s", (size | 0).toString(),
                "-p", pkgId,
                "-u", artifactUrl
            ]

            if (targets.length > 0) {
                payloadArgs.push("-t")
                payloadArgs.push(targets.join(","))
            }

            if (requiresReboot.length > 0) {
                payloadArgs.push("-r")
                payloadArgs.push(requiresReboot.join(","))
            }

            const releaseArgs = PahkatUploader.releaseArgs(release)
            return await PahkatUploader.run([...releaseArgs, ...payloadArgs])
        },

        async tarballPackage(
            release: ReleaseRequest,
            artifactUrl: string,
            installSize: number,
            size: number
        ): Promise<string> {
            const payloadArgs = [
                "tarball-package",
                "-i", (installSize | 0).toString(),
                "-s", (size | 0).toString(),
                "-u", artifactUrl
            ]

            const releaseArgs = PahkatUploader.releaseArgs(release)
            return await PahkatUploader.run([...releaseArgs, ...payloadArgs])
        },
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
    static async addNightlyToApt(requiresSudo: boolean) {
        await Bash.runScript(PROJECTJJ_NIGHTLY_SH, { sudo: requiresSudo })
    }
}

export class Kbdgen {
    static async fetchMetaBundle(metaBundlePath: string) {
        await Bash.runScript(`kbdgen meta fetch ${metaBundlePath}`)
    }

    private static async resolveOutput(p: string): Promise<string> {
        const globber = await glob.create(p, {
            followSymbolicLinks: false
        })
        const files = await globber.glob()

        if (files[0] == null) {
            throw new Error("No output found for build.")
        }

        core.debug("Got file for bundle: " + files[0])
        return files[0]
    }

    static loadTarget(bundlePath: string, target: string) {
        return nonUndefinedProxy(YAML.parse(fs.readFileSync(
            path.resolve(bundlePath, "targets", `${target}.yaml`), 'utf8')), true)
    }

    static loadProjectBundle(bundlePath: string) {
        return nonUndefinedProxy(YAML.parse(fs.readFileSync(
            path.resolve(bundlePath, "project.yaml"), 'utf8')), true)
    }

    static async loadLayouts(bundlePath: string) {
        const globber = await glob.create(path.resolve(bundlePath, "layouts/*.yaml"), {
            followSymbolicLinks: false
        })
        const layoutFiles = await globber.glob()
        var layouts: {[locale: string]: any} = {}
        for (const layoutFile of layoutFiles) {
            const locale = path.parse(layoutFile).base.split('.', 1)[0]
            layouts[locale] = YAML.parse(fs.readFileSync(layoutFile, 'utf-8'))
        }
        return layouts
    }

    static async setNightlyVersion(bundlePath: string, target: string) {
        const targetData = Kbdgen.loadTarget(bundlePath, target)

        // Set to minute-based timestamp
        targetData['version'] = await versionAsNightly(targetData['version'])

        fs.writeFileSync(path.resolve(
            bundlePath, "targets", `${target}.yaml`), YAML.stringify({...targetData}), 'utf8')

        return targetData['version']
    }

    static setBuildNumber(bundlePath: string, target: string, start: number = 0) {
        const targetData = Kbdgen.loadTarget(bundlePath, target)

        // Set to run number
        targetData['build'] = start + parseInt(process.env.GITHUB_RUN_NUMBER!, 10)
        core.debug("Set build number to " + targetData['build'])

        fs.writeFileSync(path.resolve(
            bundlePath, "targets", `${target}.yaml`), YAML.stringify({...targetData}), 'utf8')

        return targetData['build']
    }

    static async build_iOS(bundlePath: string): Promise<string> {
        const abs = path.resolve(bundlePath)
        const cwd = path.dirname(abs)
        const sec = secrets()

        // await Bash.runScript("brew install imagemagick")

        const env = {
            "GITHUB_USERNAME": sec.github.username,
            "GITHUB_TOKEN": sec.github.token,
            "MATCH_GIT_URL": sec.ios.matchGitUrl,
            "MATCH_PASSWORD": sec.ios.matchPassword,
            "FASTLANE_USER": sec.ios.fastlaneUser,
            "PRODUCE_USERNAME": sec.ios.fastlaneUser,
            "FASTLANE_PASSWORD": sec.ios.fastlanePassword,
            "APP_STORE_KEY_JSON": path.join(divvunConfigDir(), sec.macos.appStoreKeyJson),
            "MATCH_KEYCHAIN_NAME": "fastlane_tmp_keychain",
            "MATCH_KEYCHAIN_PASSWORD": "",
            "LANG": "C.UTF-8",
        }

        // Initialise any missing languages first
        // XXX: this no longer works since changes to the API!
        // await Bash.runScript(
        //     `kbdgen --logging debug build ios ${abs} init`,
        //     {
        //         cwd,
        //         env
        //     }
        // )

        // Do the build
        await Bash.runScript(
            `kbdgen --logging debug build ios -R --ci -o output ${abs}`,
            {
                cwd,
                env
            }
        )
        const globber = await glob.create(path.resolve(abs, "../output/ios-build/ipa/*.ipa"), {
            followSymbolicLinks: false
        })
        const files = await globber.glob()

        if (files[0] == null) {
            throw new Error("No output found for build.")
        }

        return files[0]
    }

    static async buildAndroid(bundlePath: string, githubRepo: string): Promise<string> {
        const abs = path.resolve(bundlePath)
        const cwd = path.dirname(abs)
        const sec = secrets()

        // await Bash.runScript("brew install imagemagick")

        await Bash.runScript(
            `kbdgen --logging debug build android -R --ci -o output ${abs}`,
            {
                cwd,
                env: {
                    "GITHUB_USERNAME": sec.github.username,
                    "GITHUB_TOKEN": sec.github.token,
                    "NDK_HOME": process.env.ANDROID_NDK_HOME!,
                    "ANDROID_KEYSTORE": path.join(divvunConfigDir(), sec.android[githubRepo].keystore),
                    "ANDROID_KEYALIAS": sec.android[githubRepo].keyalias,
                    "STORE_PW": sec.android[githubRepo].storePassword,
                    "KEY_PW": sec.android[githubRepo].keyPassword,
                    "PLAY_STORE_P12": path.join(divvunConfigDir(), sec.android.playStoreP12),
                    "PLAY_STORE_ACCOUNT": sec.android.playStoreAccount
                }
            }
        )

        return await Kbdgen.resolveOutput(path.join(cwd, "output", `*_release.apk`))
    }

    static async buildMacOS(bundlePath: string): Promise<string> {
        const abs = path.resolve(bundlePath)
        const cwd = path.dirname(abs)
        const sec = secrets()

        // Install imagemagick if we're not using the self-hosted runner
        if (process.env["ImageOS"] != null) {
            await Bash.runScript("brew install imagemagick")
        }

        await Bash.runScript(
            `kbdgen --logging debug build mac -R --ci -o output ${abs}`,
            {
                env: {
                    "DEVELOPER_PASSWORD_CHAIN_ITEM": sec.macos.passwordChainItem,
                    "DEVELOPER_ACCOUNT": sec.macos.developerAccount
                }
            }
        )

        return await Kbdgen.resolveOutput(path.join(cwd, "output", `*.pkg`))
    }

    static async buildWindows(bundlePath: string): Promise<string> {
        const abs = path.resolve(bundlePath)
        const cwd = path.dirname(abs)
        const sec = secrets()

        const msklcZip = await tc.downloadTool("https://pahkat.uit.no/artifacts/msklc.zip")
        const msklcPath = await tc.extractZip(msklcZip)

        // Export MSKLC_PATH
        core.exportVariable("MSKLC_PATH", path.join(msklcPath, "msklc1.4"))

        await Powershell.runScript(
            `kbdgen --logging trace build win -R --ci -o output ${abs}`,
            {
                env: {
                    "CODESIGN_PW": sec.windows.pfxPassword,
                    "CODESIGN_PFX": DIVVUN_PFX,
                }
            }
        )

        const globber = await glob.create(path.join(cwd, "output", `*.exe`), {
            followSymbolicLinks: false
        })
        const files = await globber.glob()

        for (const file of files) {
            if (file.includes("win7") || file.includes("kbdi")) {
                continue
            }

            core.debug("Got file for bundle: " + file)
            return file
        }

        throw new Error("No output found for build.")
    }
}

export class Subversion {
    static async import(payloadPath: string, remotePath: string) {
        core.debug("Payload path: " + payloadPath)
        core.debug("Remote path: " + remotePath)

        const sec = secrets()
        const msg = `[CI: Artifact] ${path.basename(payloadPath)}`

        return await DefaultShell.runScript(`svn import ${payloadPath} ${remotePath} -m "${msg}" --username="${sec.svn.username}" --password="${sec.svn.password}"`)
    }
}

export class ThfstTools {
    static async zhfstToBhfst(zhfstPath: string): Promise<string> {
        await DefaultShell.runScript(`thfst-tools zhfst-to-bhfst ${zhfstPath}`)
        return `${path.basename(zhfstPath, ".zhfst")}.bhfst`
    }
}

const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

export async function versionAsNightly(version: string): Promise<string> {
    const verChunks = SEMVER_RE.exec(version)?.slice(1, 4)
    if (verChunks == null) {
        throw new Error(`Provided version '${version}' is not semantic.`)
    }

    const octokit = new Octokit();
    const [owner, repo] = process.env.GITHUB_REPOSITORY!.split("/")
    const { data } = await octokit.request("GET /repos/:owner/:repo/actions/runs/:run_id", {
        owner,
        repo,
        run_id: parseInt(process.env.GITHUB_RUN_ID!, 10)
    })

    const nightlyTs = data.created_at.replace(/[-:\.]/g, "")

    return `${verChunks.join(".")}-nightly.${nightlyTs}`
}

function deriveBundlerArgs(spellerPaths: SpellerPaths, withZhfst: boolean = true) {
    const args = []
    for (const [langTag, zhfstPath] of Object.entries(spellerPaths.desktop)) {
        args.push("-l")
        args.push(langTag)

        if (withZhfst) {
            args.push("-z")
            args.push(zhfstPath)
        }
    }
    return args
}

export type SpellerPaths = {
    desktop: { [key: string]: string },
    mobile: { [key: string]: string }
}

export class DivvunBundler {
    static async bundleMacOS(
        name: string,
        version: string,
        packageId: string,
        langTag: string,
        spellerPaths: SpellerPaths
    ): Promise<string> {
        const sec = secrets();

        const args = [
            "-R", "-o", "output", "-t", "osx",
            "-H", name,
            "-V", version,
            "-a", `Developer ID Application: The University of Tromso (2K5J2584NX)`,
            "-i", `Developer ID Installer: The University of Tromso (2K5J2584NX)`,
            "-n", sec.macos.developerAccount,
            "-p", sec.macos.appPassword,
            "speller",
            "-f", langTag,
            ...deriveBundlerArgs(spellerPaths)
        ]

        assertExit0(await exec("divvun-bundler", args, {
            env: Object.assign({}, env(), {
                "RUST_LOG": "trace"
            })
        }))

        // FIXME: workaround bundler issue creating invalid files
        await io.cp(
            path.resolve(`output/${langTag}-${version}.pkg`),
            path.resolve(`output/${packageId}-${version}.pkg`))

        const outputFile = path.resolve(`output/${packageId}-${version}.pkg`)
        return outputFile
    }

    // static async bundleWindows(
    //     name: string,
    //     version: string,
    //     manifest: WindowsSpellerManifest,
    //     packageId: string,
    //     langTag: string,
    //     spellerPaths: SpellerPaths
    // ) {
    //     const sec = secrets();

    //     let exe: string
    //     if (process.platform === "win32") {
    //         exe = path.join(PahkatPrefix.path, "pkg", "divvun-bundler", "bin", "divvun-bundler.exe")
    //     } else {
    //         exe = "divvun-bundler"
    //     }

    //     const args = ["-R", "-t", "win", "-o", "output",
    //         "--uuid", productCode,
    //         "-H", name,
    //         "-V", version,
    //         "-c", DIVVUN_PFX,
    //         "speller",
    //         "-f", langTag,
    //         ...deriveBundlerArgs(spellerPaths)
    //     ]

    //     assertExit0(await exec(exe, args, {
    //         env: Object.assign({}, env(), {
    //             "RUST_LOG": "trace",
    //             "SIGN_PFX_PASSWORD": sec.windows.pfxPassword,
    //         })
    //     }))

    //     try {
    //         core.debug(fs.readdirSync("output").join(", "))
    //     } catch (err) {
    //         core.debug("Failed to read output dir")
    //         core.debug(err)
    //     }

    //     // FIXME: workaround bundler issue creating invalid files
    //     await io.cp(
    //         path.resolve(`output/${langTag}-${version}.exe`),
    //         path.resolve(`output/${packageId}-${version}.exe`))

    //     return path.resolve(`output/${packageId}-${version}.exe`)
    // }
}

export function nonUndefinedProxy(obj: any, withNull: boolean = false): any {
    return new Proxy(obj, {
        get: (target, prop, receiver) => {
            const v = Reflect.get(target, prop, receiver)
            if (v === undefined) {
                throw new Error(`'${String(prop)}' was undefined and this is disallowed. Available keys: ${Object.keys(obj).join(", ")}`)
            }

            if (withNull && v === null) {
                throw new Error(`'${String(prop)}' was null and this is disallowed. Available keys: ${Object.keys(obj).join(", ")}`)
            }

            if (v != null && (Array.isArray(v) || typeof v === 'object')) {
                return nonUndefinedProxy(v, withNull)
            } else {
                return v
            }
        }
    })
}

export function validateProductCode(kind: WindowsExecutableKind, code: string): string {
    if (kind === null) {
        core.debug("Found no kind, returning original code")
        return code
    }

    if (kind === WindowsExecutableKind.Inno) {
        if (code.startsWith("{") && code.endsWith("}_is1")) {
            core.debug("Found valid product code for Inno installer: " + code);
            return code
        }

        let updatedCode = code;

        if (!code.endsWith("}_is1") && !code.startsWith("{")) {
            core.debug("Found plain UUID for Inno installer, wrapping in {...}_is1")
            updatedCode = `{${code}}_is1`
        }
        else if (code.endsWith("}") && code.startsWith("{")) {
            core.debug("Found wrapped GUID for Inno installer, adding _is1")
            updatedCode = `${code}_is1`
        } else {
            throw new Error(`Could not handle invalid Inno product code: ${code}`)
        }

        core.debug(`'${code}' -> '${updatedCode}`)
        return updatedCode
    }

    if (kind === WindowsExecutableKind.Nsis) {
        if (code.startsWith("{") && code.endsWith("}")) {
            core.debug("Found valid product code for Nsis installer: " + code)
            return code
        }

        let updatedCode = code

        if (!code.endsWith("}") && !code.startsWith("{")) {
            core.debug("Found plain UUID for Nsis installer, wrapping in {...}")
            updatedCode = `{${code}}`
        } else {
            throw new Error(`Could not handle invalid Nsis product code: ${code}`)
        }

        core.debug(`'${code}' -> '${updatedCode}`)
        return updatedCode
    }

    throw new Error("Unhandled kind: " + kind)
}

export function isCurrentBranch(names: string[]) {
    const value = process.env.GITHUB_REF

    core.debug(`names: ${names}`)
    core.debug(`GITHUB_REF: '${value}'`)

    if (value == null) {
        return false
    }

    for (const name of names) {
        if (value === `refs/heads/${name}`) {
            return true
        }
    }

    return false
}

export function isMatchingTag(tagPattern: RegExp) {
    let value = process.env.GITHUB_REF

    core.debug(`tag pattern: ${tagPattern}`)
    core.debug(`GITHUB_REF: '${value}'`)

    if (value == null) {
        return false
    }

    const prefix = "refs/tags/"
    if (!value.startsWith(prefix)) {
        return false
    }

    value = value.substring(prefix.length)
    return tagPattern.test(value)
}
