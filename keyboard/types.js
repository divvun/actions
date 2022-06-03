"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBundle = exports.KeyboardType = void 0;
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
