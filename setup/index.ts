import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as os from 'os'
import * as tc from "@actions/tool-cache"
import * as io from "@actions/io"
import path from "path"

import { Bash, divvunConfigDir, randomHexBytes, randomString64, secrets, Tar, tmpDir } from '../shared'

async function downloadAppleWWDRCA() {
  return await tc.downloadTool("https://developer.apple.com/certificationauthority/AppleWWDRCA.cer")
}

class Security {
  constructor() { throw new Error("cannot be instantiated") }

  private static async run(subcommand: string, args: string[]) {
    return await Bash.runScript(`security ${subcommand} ${args.join(" ")}`)
  }

  public static async deleteKeychain(name: string) {
    return await Security.run("delete-keychain", [`${name}.keychain`])
  }

  public static async createKeychain(name: string, password: string) {
    core.setSecret(password)
    return await Security.run("create-keychain", ["-p", `"${password}"`, `${name}.keychain`])
  }

  public static async defaultKeychain(name: string) {
    return await Security.run("default-keychain", ["-s", `${name}.keychain`])
  }

  public static async unlockKeychain(name: string, password: string) {
    core.setSecret(password)
    return await Security.run("unlock-keychain", ["-p", `"${password}"`, `${name}.keychain`])
  }

  public static async setKeychainTimeout(name: string, timeout: number) {
    const intTimeout = (timeout | 0).toString()
    return await Security.run("set-keychain-settings", ["-t", intTimeout, "-u", `${name}.keychain`])
  }

  public static async import(keychainName: string, certOrKeyPath: string, keyPassword?: string) {
    if (keyPassword != null) {
      core.setSecret(keyPassword)
      return await Security.run("import", [certOrKeyPath, "-k", `~/Library/Keychains/${keychainName}.keychain`, "-P", `"${keyPassword}"`, "-A"])
    } else {
      return await Security.run("import", [certOrKeyPath, "-k", `~/Library/Keychains/${keychainName}.keychain`, "-A"])
    }
  }

  public static async setKeyPartitionList(keychainName: string, password: string, partitionList: string[]) {
    core.setSecret(password)
    return await Security.run(
      "set-key-partition-list",
      ["-S", partitionList.join(","), "-s", "-k", `"${password}"`, `${keychainName}.keychain`]
    )
  }
}

function debug(input: string[]) {
  const [out, err] = input

  if (out.trim() != '') {
    core.debug(out)
  }

  if (err.trim() != '') {
    core.error(err)
  }
}

async function setupMacOSKeychain() {
  const sec = secrets()

  const name = `divvun-build-${randomHexBytes(6)}`
  const password = randomString64()

  try {
    debug(await Security.deleteKeychain(name))
  } catch (_) {}

  debug(await Security.createKeychain(name, password))
  debug(await Security.defaultKeychain(name))
  debug(await Security.unlockKeychain(name, password))
  debug(await Security.setKeychainTimeout(name, 36000))

  // Import certs
  const certPath = await downloadAppleWWDRCA()
  debug(await Security.import(name, certPath))
  debug(await Security.import(name, path.resolve(divvunConfigDir(), sec.macos.appCer)))
  debug(await Security.import(name, path.resolve(divvunConfigDir(), sec.macos.installerCer)))

  // Import keys
  debug(await Security.import(name, path.resolve(
    divvunConfigDir(), sec.macos.installerP12), sec.macos.installerP12Password))
  debug(await Security.import(name, path.resolve(
    divvunConfigDir(), sec.macos.appP12), sec.macos.appP12Password))

  debug(await Security.setKeyPartitionList(name, password, ["apple-tool:", "apple:", "codesign:"]))

  debug(
    await Bash.runScript(`xcrun altool --store-password-in-keychain-item "${sec.macos.passwordChainItem}" -u "${sec.macos.developerAccount}" -p "${sec.macos.appPassword}"`)
  )
}

async function cloneConfigRepo(password: string) {
  core.setSecret(password)

  const dir = tmpDir()
  await Bash.runScript("git clone --depth=1 https://github.com/divvun/divvun-ci-config.git", { cwd: dir })
  
  const repoDir = divvunConfigDir()
  await Bash.runScript(`openssl aes-256-cbc -d -in ./config.txz.enc -pass pass:${password} -out config.txz -md md5`, { cwd: repoDir })
  await Tar.bootstrap()
  await Tar.extractTxz(path.resolve(repoDir, "config.txz"), repoDir)
}

async function bootstrapDependencies() {
  // try {
  //   const svnPath = await io.which("svn")
  //   core.debug(`SVN path: ${svnPath}`)
  // } catch (_) {
    core.debug("Installing subversion")
    debug(await Bash.runScript("brew install subversion"))
  // }
}

async function run() {
  try {
    const divvunKey = core.getInput("key", { required: true })
    core.setSecret(divvunKey)
    console.log("Setting up environment")

    await cloneConfigRepo(divvunKey)

    if (process.platform === "win32") {
      core.addPath("C:\\Program Files (x86)\\Microsoft SDKs\\ClickOnce\\SignTool")
    } else if (process.platform == "darwin") {
      await setupMacOSKeychain()
      await bootstrapDependencies()
    }
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run().catch(err => {
  console.error(err.stack)
  process.exit(1)
})
