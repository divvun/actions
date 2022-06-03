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
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const shared_1 = require("../../shared");
function getSudo() {
    const x = core.getInput("sudo");
    if (x === "true") {
        return true;
    }
    if (x === "false") {
        return false;
    }
    throw new Error("invalid value: " + x);
}
async function run() {
    const requiresSudo = getSudo();
    const requiresApertium = !!core.getInput("apertium");
    core.debug("Requires sudo? " + requiresSudo);
    const basePackages = [
        "wget",
        "build-essential",
        "autotools-dev",
        "autoconf",
        "git",
        "pkg-config",
        "gawk",
        "python3-pip",
        "zip",
        "bc"
    ];
    const devPackages = ["foma", "hfst", "libhfst-dev", "cg3-dev", "divvun-gramcheck"];
    if (requiresApertium) {
        devPackages.push("apertium");
        devPackages.push("apertium-dev");
        devPackages.push("apertium-lex-tools");
        devPackages.push("lexd");
    }
    await shared_1.Apt.update(requiresSudo);
    await shared_1.Apt.install(basePackages, requiresSudo);
    await shared_1.Pip.install(["PyYAML"], requiresSudo);
    await shared_1.ProjectJJ.addNightlyToApt(requiresSudo);
    await shared_1.Apt.install(devPackages, requiresSudo);
    await shared_1.Ssh.cleanKnownHosts();
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
