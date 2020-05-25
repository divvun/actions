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
const exec_1 = require("@actions/exec");
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const yaml_1 = __importDefault(require("yaml"));
function divvunConfigDir() {
    const runner = process.env['RUNNER_WORKSPACE'];
    if (!runner)
        throw new Error('no RUNNER_WORKSPACE set');
    return path_1.default.resolve(runner, "divvun-ci-config");
}
exports.divvunConfigDir = divvunConfigDir;
function shouldDeploy() {
    const isMaster = github.context.ref == 'refs/heads/master';
    return isMaster;
}
exports.shouldDeploy = shouldDeploy;
function loadEnv() {
    const p = path_1.default.resolve(divvunConfigDir(), "enc", "env.json");
    const s = fs_1.default.readFileSync(p, "utf8");
    return JSON.parse(s);
}
exports.loadEnv = loadEnv;
function loadKbdgenTarget(kbdgenPath, target) {
    return yaml_1.default.parse(fs_1.default.readFileSync(path_1.default.resolve(kbdgenPath, "targets", `${target}.yaml`), 'utf8'));
}
exports.loadKbdgenTarget = loadKbdgenTarget;
function saveKbdgenTarget(kbdgenPath, target, body) {
    fs_1.default.writeFileSync(path_1.default.resolve(kbdgenPath, "targets", `${target}.yaml`), yaml_1.default.stringify(body), 'utf8');
}
exports.saveKbdgenTarget = saveKbdgenTarget;
const env = {
    ...process.env,
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    DEBIAN_FRONTEND: "noninteractive",
    DEBCONF_NONINTERACTIVE_SEEN: "true"
};
function assertExit0(code) {
    if (code !== 0) {
        core.setFailed(`Process exited with exit code ${code}.`);
    }
}
class Apt {
    static async update() {
        assertExit0(await exec_1.exec("apt-get", ["-qy", "update"], { env }));
    }
    static async install(packages) {
        assertExit0(await exec_1.exec("apt-get", ["install", "-qfy", ...packages], { env }));
    }
}
exports.Apt = Apt;
class Pip {
    static async install(packages) {
        assertExit0(await exec_1.exec("pip3", ["install", ...packages], { env }));
    }
}
exports.Pip = Pip;
class Bash {
    static async runScript(script, cwd = undefined) {
        assertExit0(await exec_1.exec("bash", ["-c", script], { env, cwd }));
    }
}
exports.Bash = Bash;
const CLEAR_KNOWN_HOSTS_SH = `\
mkdir -pv ~/.ssh
ssh-keyscan github.com | tee -a ~/.ssh/known_hosts
cat ~/.ssh/known_hosts | sort | uniq > ~/.ssh/known_hosts.new
mv ~/.ssh/known_hosts.new ~/.ssh/known_hosts
`;
class Ssh {
    static async cleanKnownHosts() {
        await Bash.runScript(CLEAR_KNOWN_HOSTS_SH);
    }
}
exports.Ssh = Ssh;
const PROJECTJJ_NIGHTLY_SH = `\
wget -q https://apertium.projectjj.com/apt/install-nightly.sh -O install-nightly.sh && bash install-nightly.sh
`;
class ProjectJJ {
    static async addNightlyToApt() {
        await Bash.runScript(PROJECTJJ_NIGHTLY_SH);
    }
}
exports.ProjectJJ = ProjectJJ;
