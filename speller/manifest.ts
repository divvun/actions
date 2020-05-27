import * as github from '@actions/github'

export enum SpellerType {
    MacOS = "speller-macos",
    Mobile = "speller-mobile",
    Windows = "speller-windows",
    WindowsMSOffice = "speller-windows-msoffice",
}

export type SpellerManifest = {
    name: string,
    version: string,
    windows: {
        system_product_code: string,
        msoffice_product_code: string,
    }
    macos: {
        system_pkg_id: string,
    }
}

export function deriveLangTag(force3: boolean) {
    const lang = github.context.repo.repo.split("lang-")[1]

    if (force3) {
        return lang
    }

    // It's easier for us to just special case the 3 character variants
    // than to add another dependency.
    if (lang == "sme") {
        return "se"
    }

    return lang
}

export function derivePackageId(type: SpellerType) {
    const lang = github.context.repo.repo.split("lang-")[1]
    
    if (type == SpellerType.WindowsMSOffice) {
        return `speller-${lang}-mso`
    }

    return `speller-${lang}`
}