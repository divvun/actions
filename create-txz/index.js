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
const glob = __importStar(require("@actions/glob"));
const path_1 = __importDefault(require("path"));
const tmp_1 = __importDefault(require("tmp"));
const shared_1 = require("../shared");
async function run() {
    const filesPath = core.getInput('path', { required: true });
    const globber = await glob.create(path_1.default.join(filesPath, "*"), {
        followSymbolicLinks: false
    });
    const files = await globber.glob();
    await shared_1.Tar.bootstrap();
    const outputTxz = tmp_1.default.fileSync({
        postfix: ".txz",
        keep: true,
        tries: 3,
    }).name;
    await shared_1.Tar.createFlatTxz(files, outputTxz);
    core.setOutput("txz-path", outputTxz);
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
