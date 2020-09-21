"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.derivePackageId = exports.deriveLangTag = exports.SpellerType = void 0;
const github = __importStar(require("@actions/github"));
var SpellerType;
(function (SpellerType) {
    SpellerType["MacOS"] = "speller-macos";
    SpellerType["Mobile"] = "speller-mobile";
    SpellerType["Windows"] = "speller-windows";
})(SpellerType = exports.SpellerType || (exports.SpellerType = {}));
function deriveLangTag(force3) {
    const lang = github.context.repo.repo.split("lang-")[1];
    if (force3) {
        return lang;
    }
    if (lang == "sme") {
        return "se";
    }
    if (lang === "fao") {
        return "fo";
    }
    if (lang === "kal") {
        return "kl";
    }
    return lang;
}
exports.deriveLangTag = deriveLangTag;
function derivePackageId(type) {
    const lang = github.context.repo.repo.split("lang-")[1];
    return `speller-${lang}`;
}
exports.derivePackageId = derivePackageId;
