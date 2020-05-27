import * as core from "@actions/core"
import fs from 'fs'

export enum KeyboardType {
    iOS = "keyboard-ios",
    Android = "keyboard-android",
    MacOS = "keyboard-macos",
    Windows = "keyboard-windows",
    ChromeOS = "keyboard-chromeos",
    M17n = "keyboard-m17n",
    X11 = "keyboard-x11"
}

export function getBundle() {
    const override = core.getInput("bundle-path")
    if (override) {
        return override
    }

    for (const item of fs.readdirSync(".")) {
        if (item.endsWith(".kbdgen")) {
            return item
        }
    }

    throw new Error("Did not find bundle with .kbdgen suffix.")
}