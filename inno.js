"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InnoSetupBuilder = void 0;
const fs_1 = __importDefault(require("fs"));
function stringFromInnoFile(input) {
    let out = `Source: "${input.Source}"; DestDir: "${input.DestDir}"`;
    if (input.Check) {
        out += "; Check: " + input.Check;
    }
    if (input.Flags) {
        out += "; Flags: ";
        out += input.Flags.join(" ");
    }
    return out;
}
class InnoSetupBuilder {
    constructor() {
        this.data = {};
    }
    name(input) {
        this.data.name = input;
        return this;
    }
    version(input) {
        this.data.version = input;
        return this;
    }
    publisher(input) {
        this.data.publisher = input;
        return this;
    }
    url(input) {
        this.data.url = input;
        return this;
    }
    productCode(input) {
        if (input.endsWith("_is1")) {
            input = input.substring(0, input.length - 4);
        }
        this.data.productCode = input;
        return this;
    }
    defaultDirName(input) {
        this.data.defaultDirName = input;
        return this;
    }
    files(callback) {
        this.data.files = callback(new InnoSetupFilesBuilder());
        return this;
    }
    code(callback) {
        this.data.code = callback(new InnoSetupCodeBuilder());
        return this;
    }
    run(callback) {
        if (!this.data.run) {
            this.data.run = [];
        }
        this.data.run.push(callback(new InnoCommandBuilder()));
        return this;
    }
    uninstallRun(callback) {
        if (!this.data.uninstallRun) {
            this.data.uninstallRun = [];
        }
        this.data.uninstallRun.push(callback(new InnoCommandBuilder()));
        return this;
    }
    icons(callback) {
        if (!this.data.icons) {
            this.data.icons = [];
        }
        this.data.icons.push(callback(new InnoCommandBuilder()));
        return this;
    }
    build() {
        for (const key of ["name", "version", "url", "productCode", "defaultDirName"]) {
            if (this.data[key] == null) {
                throw new Error(`Missing key "${key}" for Inno Setup builder`);
            }
        }
        const { name, version, publisher, url, productCode, defaultDirName } = this.data;
        const setup = Object.entries({
            AppId: `{${productCode}`,
            AppName: name,
            AppVersion: version,
            AppPublisher: publisher,
            AppPublisherURL: url,
            AppSupportURL: url,
            AppUpdatesURL: url,
            DefaultDirName: defaultDirName,
            DisableDirPage: "yes",
            DisableProgramGroupPage: "yes",
            OutputBaseFilename: "install",
            Compression: "lzma",
            SolidCompression: "yes",
            WizardStyle: "modern",
            SignedUninstaller: "yes",
            SignTool: "signtool",
            MinVersion: this.data.minVersion || "6.3.9200",
            ArchitecturesAllowed: "x86 x64",
            ArchitecturesInstallIn64BitMode: "x64"
        }).map(x => `${x[0]}=${x[1]}`).join("\n");
        const iss = {
            setup,
            languages: INNO_LANGUAGES_SECTION
        };
        const { code, run, uninstallRun, icons, files } = this.data;
        if (files != null) {
            iss.files = files.build();
        }
        if (code != null) {
            iss.code = code.build();
        }
        let out = `[Setup]\n${iss.setup}\n\n[Languages]\n${iss.languages}\n\n`;
        if (iss.files != null) {
            out += `[Files]\n${iss.files}\n\n`;
        }
        if (iss.code != null) {
            out += `[Code]\n${iss.code}\n\n`;
        }
        if (run != null) {
            var runScript = "";
            for (const runBuilder of run) {
                runScript += `${runBuilder.build()}\n`;
            }
            out += `[Run]\n${runScript}\n\n`;
        }
        if (uninstallRun != null) {
            var uninstallRunScript = "";
            for (const uninstallRunBuilder of uninstallRun) {
                uninstallRunScript += `${uninstallRunBuilder.build()}\n`;
            }
            out += `[UninstallRun]\n${uninstallRunScript}\n\n`;
        }
        if (icons != null) {
            var iconsScript = "";
            for (const iconsBuilder of icons) {
                iconsScript += `${iconsBuilder.build()}\n`;
            }
            out += `[Icons]\n${iconsScript}\n\n`;
        }
        return out;
    }
    write(filePath) {
        fs_1.default.writeFileSync(filePath, this.build(), "utf8");
    }
}
exports.InnoSetupBuilder = InnoSetupBuilder;
const INNO_LANGUAGES_SECTION = `\
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "armenian"; MessagesFile: "compiler:Languages\\Armenian.isl"
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\\BrazilianPortuguese.isl"
Name: "catalan"; MessagesFile: "compiler:Languages\\Catalan.isl"
Name: "corsican"; MessagesFile: "compiler:Languages\\Corsican.isl"
Name: "czech"; MessagesFile: "compiler:Languages\\Czech.isl"
Name: "danish"; MessagesFile: "compiler:Languages\\Danish.isl"
Name: "dutch"; MessagesFile: "compiler:Languages\\Dutch.isl"
Name: "finnish"; MessagesFile: "compiler:Languages\\Finnish.isl"
Name: "french"; MessagesFile: "compiler:Languages\\French.isl"
Name: "german"; MessagesFile: "compiler:Languages\\German.isl"
Name: "hebrew"; MessagesFile: "compiler:Languages\\Hebrew.isl"
Name: "icelandic"; MessagesFile: "compiler:Languages\\Icelandic.isl"
Name: "italian"; MessagesFile: "compiler:Languages\\Italian.isl"
Name: "japanese"; MessagesFile: "compiler:Languages\\Japanese.isl"
Name: "norwegian"; MessagesFile: "compiler:Languages\\Norwegian.isl"
Name: "polish"; MessagesFile: "compiler:Languages\\Polish.isl"
Name: "portuguese"; MessagesFile: "compiler:Languages\\Portuguese.isl"
Name: "russian"; MessagesFile: "compiler:Languages\\Russian.isl"
Name: "slovak"; MessagesFile: "compiler:Languages\\Slovak.isl"
Name: "slovenian"; MessagesFile: "compiler:Languages\\Slovenian.isl"
Name: "spanish"; MessagesFile: "compiler:Languages\\Spanish.isl"
Name: "turkish"; MessagesFile: "compiler:Languages\\Turkish.isl"
Name: "ukrainian"; MessagesFile: "compiler:Languages\\Ukrainian.isl"
`;
const INNO_CODE_HEADER = `\
function UninstallMsiIfExists(sCode: String): String;
var
  sUnInstPath: String;
  sUnInstPathWow64: String;
  sUnInstallString: String;
  iResultCode: Integer;
begin
  sUnInstPath := 'Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\' + sCode;
  sUnInstPathWow64 := 'Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\' + sCode;
  sUnInstallString := '';
  if not RegQueryStringValue(HKLM, sUnInstPath, 'UninstallString', sUnInstallString) then
    RegQueryStringValue(HKLM, sUnInstPathWow64, 'UninstallString', sUnInstallString);
  if sUnInstallString <> '' then
  begin
    Exec('msiexec', '/qn /x ' + sCode, '', SW_HIDE, ewWaitUntilTerminated, iResultCode);
    if iResultCode <> 0 then
    begin
        Result := 'Failed to uninstall ' + sCode + ' (Error code: ' + IntToStr(iResultCode) + ')';
    end;
  end;
end;


function UninstallIfExists(sInput: String; sArgs: String): String;
var
  sUnInstPath: String;
  sUnInstPathWow64: String;
  sUnInstallString: String;
  iResultCode: Integer;
begin
  sUnInstPath := 'Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\' + sInput;
  sUnInstPathWow64 := 'Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\' + sInput;
  sUnInstallString := '';
  if not RegQueryStringValue(HKLM, sUnInstPath, 'UninstallString', sUnInstallString) then
    RegQueryStringValue(HKLM, sUnInstPathWow64, 'UninstallString', sUnInstallString);
  if sUnInstallString <> '' then
  begin
    Exec(sUnInstallString, sArgs, '', SW_HIDE, ewWaitUntilTerminated, iResultCode);
    if iResultCode <> 0 then
    begin
        Result := 'Failed to uninstall ' + sInput + ' (Error code: ' + IntToStr(iResultCode) + ')';
    end;
  end;
end;
`;
const INNO_CODE_EVENTS = `\
procedure CurStepChanged(CurStep: TSetupStep);
var
    RunResult: String;
begin
    if CurStep = ssPostInstall then
    begin
        RunResult := RunPostInstall();
        if RunResult <> '' then RaiseException(RunResult);
    end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
    RunResult: String;
begin
    if CurUninstallStep = usUninstall then
    begin
        RunResult := RunPreUninstall();
        if RunResult <> '' then RaiseException(RunResult);
    end;
    if CurUninstallStep = usPostUninstall then
    begin
        RunResult := RunPostUninstall();
        if RunResult <> '' then RaiseException(RunResult);
    end;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
    Result := RunPreInstall();
end;
`;
function generateExec(binary, args, errorMsg) {
    return `\
if Result = '' then
begin
    Exec(ExpandConstant('${binary}'), ExpandConstant('${args}'), '', SW_HIDE, ewWaitUntilTerminated, iResultCode);
    if iResultCode <> 0 then
    begin
        Result := '${errorMsg.replace(/'/g, "\\'")} (Error code: ' + IntToStr(iResultCode) + ')';
    end;
end;
`;
}
function generateNsisUninst(productCode) {
    return `\
if Result = '' then
begin
    Result := UninstallIfExists('${productCode}', '/S');
end;
`;
}
function generateMsiUninst(productCode) {
    return `\
if Result = '' then
begin
    Result := UninstallMsiIfExists('${productCode}');
end;
`;
}
class InnoSetupCodeBuilder {
    constructor() {
        this.preInstalls = [];
        this.postInstalls = [];
        this.preUninstalls = [];
        this.postUninstalls = [];
    }
    uninstallLegacy(productCode, type) {
        if (type === "nsis") {
            this.preInstalls.push(generateNsisUninst(productCode));
        }
        else if (type === "msi") {
            this.preInstalls.push(generateMsiUninst(productCode));
        }
        else {
            throw new Error(`Unhandled type: '${type}'`);
        }
        return this;
    }
    execPreInstall(binary, args, errorMsg) {
        this.preInstalls.push(generateExec(binary, args, errorMsg));
        return this;
    }
    execPostInstall(binary, args, errorMsg) {
        this.postInstalls.push(generateExec(binary, args, errorMsg));
        return this;
    }
    execPreUninstall(binary, args, errorMsg) {
        this.preUninstalls.push(generateExec(binary, args, errorMsg));
        return this;
    }
    execPostUninstall(binary, args, errorMsg) {
        this.postUninstalls.push(generateExec(binary, args, errorMsg));
        return this;
    }
    generatePreInstall() {
        const cmd = `\
function RunPreInstall: String;
var
    iResultCode: Integer;
begin
${this.preInstalls.join("\n")}
end;
`;
        return cmd;
    }
    generatePostInstall() {
        const cmd = `\
function RunPostInstall: String;
var
    iResultCode: Integer;
begin
${this.postInstalls.join("\n")}
end;
`;
        return cmd;
    }
    generatePreUninstall() {
        const cmd = `\
function RunPreUninstall: String;
var
    iResultCode: Integer;
begin
${this.preUninstalls.join("\n")}
end;
`;
        return cmd;
    }
    generatePostUninstall() {
        const cmd = `\
function RunPostUninstall: String;
var
    iResultCode: Integer;
begin
${this.postUninstalls.join("\n")}
end;
`;
        return cmd;
    }
    build() {
        return `\
${INNO_CODE_HEADER}
${this.generatePreInstall()}
${this.generatePostInstall()}
${this.generatePreUninstall()}
${this.generatePostUninstall()}
${INNO_CODE_EVENTS}
`;
    }
}
class InnoSetupFilesBuilder {
    constructor() {
        this.files = [];
    }
    add(source, dest, flags, check) {
        this.files.push({
            Source: source,
            DestDir: dest,
            Check: check,
            Flags: flags
        });
        return this;
    }
    build() {
        return this.files.map(stringFromInnoFile).join("\n");
    }
}
class InnoCommandBuilder {
    constructor() {
        this.executableName = "";
        this.parameters = [];
        this.flags = [];
        this.name = "";
    }
    withFilename(filename) {
        this.executableName = filename;
        return this;
    }
    withParameter(parameter) {
        this.parameters.push(parameter);
        return this;
    }
    withFlags(flags) {
        this.flags = flags;
        return this;
    }
    withName(name) {
        this.name = name;
        return this;
    }
    build() {
        var parameters = this.parameters.join(" ");
        var ret = "";
        if (this.name) {
            ret += `Name: ${this.name}; `;
        }
        ret += `Filename: ${this.executableName}; Parameters: ${parameters}`;
        if (this.flags) {
            var flags = this.flags.join(" ");
            ret += `; Flags: ${flags}`;
        }
        return ret;
    }
}
