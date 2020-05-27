"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const fs_1 = __importDefault(require("fs"));
var KeyboardType;
(function (KeyboardType) {
    KeyboardType["iOS"] = "keyboard-ios";
    KeyboardType["Android"] = "keyboard-android";
    KeyboardType["MacOS"] = "keyboard-macos";
    KeyboardType["Windows"] = "keyboard-windows";
    KeyboardType["ChromeOS"] = "keyboard-chromeos";
    KeyboardType["M17n"] = "keyboard-m17n";
    KeyboardType["X11"] = "keyboard-x11";
})(KeyboardType = exports.KeyboardType || (exports.KeyboardType = {}));
function getBundle() {
    const override = core.getInput("bundle-path");
    if (override) {
        return override;
    }
    for (const item of fs_1.default.readdirSync(".")) {
        if (item.endsWith(".kbdgen")) {
            return item;
        }
    }
    throw new Error("Did not find bundle with .kbdgen suffix.");
}
exports.getBundle = getBundle;
