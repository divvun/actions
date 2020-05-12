import * as core from '@actions/core'
// import * as github from '@actions/github'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as os from 'os'
import path from 'path'
import { divvunConfigDir } from '../shared'

type Tool = {
  [platform: string]: string
}

const TOOLS: Record<string, Tool> = {
  "divvun-bundler": {
    darwin: "https://github.com/divvun/divvun-bundler/releases/download/0.1.0/divvun-bundler-macos",
    win32: "https://github.com/divvun/divvun-bundler/releases/download/0.1.0/divvun-bundler.exe",
  },
  "win-reg-tool": {
    win32: "https://github.com/fry/win-reg-tool/releases/download/0.1.3/win-reg-tool.exe",
  },
  pahkat: {
    darwin: "https://github.com/divvun/pahkat/releases/download/0.6.0/pahkat-macos",
    win32: "https://github.com/divvun/pahkat/releases/download/0.6.0/pahkat.exe",
  },
  "pahkat-repomgr": {
    darwin: "https://github.com/divvun/pahkat/releases/download/0.6.0/pahkat-repomgr-macos",
    win32: "https://github.com/divvun/pahkat/releases/download/repomgr-v1.0.0-alpha.1/pahkat-repomgr1.0.0-alpha.1_windows_amd64.exe",
  },
  kbdgen: {
    darwin: "https://github.com/divvun/kbdgen/releases/download/v2.0.0-alpha.8/kbdgen_2.0.0-alpha.8_macos_amd64.tar.xz",
    linux: "https://github.com/divvun/kbdgen/releases/download/v2.0.0-alpha.8/kbdgen_2.0.0-alpha.8_linux_amd64.tar.xz",
    win32: "https://github.com/divvun/kbdgen/releases/download/v2.0.0-alpha.8/kbdgen_2.0.0-alpha.8_windows_amd64.exe",
  },
  xcnotary: {
    darwin: "https://github.com/fry/xcnotary/releases/download/v0.4.1/xcnotary"
  },
  "thfst-tools": {
    win32: "https://github.com/divvun/divvunspell/releases/download/v1.0.0-alpha.2/thfst-tools_win.exe",
    darwin: "https://github.com/divvun/divvunspell/releases/download/v1.0.0-alpha.2/thfst-tools_macos",
    linux: "https://github.com/divvun/divvunspell/releases/download/v1.0.0-alpha.2/thfst-tools_linux"
  }
}

const TOOLS_PATH = "_tools"

function getSetupScript() {
  if (process.platform == "darwin")
    return `${__dirname}/setup-macos.sh`
  if (process.platform == "win32")
    return `${__dirname}/setup-win.sh`
  if (process.platform == "linux")
    return "setup-linux.sh"

  throw new Error(`Unsupported platform ${process.platform}`)
}

function getToolUrl(name: string) {
  const toolsOs = TOOLS[name]
  if (!toolsOs)
    throw new Error(`No such tool ${name}`)
  return toolsOs[process.platform]
}

async function run() {
  try {
    const divvunKey = core.getInput('key');

    console.log("Setting up environment")
    await exec.exec("bash", [getSetupScript()], {
      cwd: process.env['RUNNER_WORKSPACE'],
      env: {
        "DIVVUN_KEY": divvunKey,
        "HOME": os.homedir()
      }
    });

    if (process.platform == "win32") {
      core.addPath("C:\\Program Files (x86)\\Microsoft SDKs\\ClickOnce\\SignTool")
    }

    core.exportVariable("DIVVUN_CI_CONFIG", divvunConfigDir())

    console.log("Installing tools")

    for (const toolName in TOOLS) {
      console.log(`installing tool ${toolName}`)
      const url = getToolUrl(toolName)
      if (!url) {
        console.log("tool not available")
        continue;
      }
      const toolDir = path.resolve(TOOLS_PATH, toolName)
      console.log(`tool dir ${toolDir}`)
      io.mkdirP(toolDir)
      const downloadPath = await tc.downloadTool(url)
      if (downloadPath.endsWith("tar.xz")) {
        if (process.platform != "win32")
          tc.extractTar(downloadPath, toolDir)
        else
          throw new Error("Can't extract tool on windows")
      } else {
        const toolDest = `${toolDir}/${toolName}`
        if (process.platform == "win32") {
          io.cp(downloadPath, `${toolDest}.exe`)
        } else {
          io.cp(downloadPath, toolDest)
          exec.exec("chmod", ['+x', toolDest])
        }
      }
      core.addPath(toolDir)
    }
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()