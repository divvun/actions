
export interface Speller {
    filename: string
    name_win?: string
}

export type SpellerBundleType = "speller_win" | "speller_win_mso" | "speller_macos" | "speller_mobile"
export type KeyboardBundleType = "keyboard_android" | "keyboard_ios" | "keyboard_macos" | "keyboard_win"
export type BundleType = SpellerBundleType | KeyboardBundleType

export interface Bundle {
    package: string,
    platform?: "windows" | "macos" | "mobile",
    repo: string,
}

export type SpellerBundle = Bundle & {
    uuid?: string,
    pkg_id?: string,
}

export type KeyboardBundle = Bundle & {
    consolidated?: boolean,
}

export interface ConsolidatedLayouts {
    git: string,
    branch?: string,
    layouts: string[]
}

export interface Manifest {
    package: {
        name: string,
        human_name?: string,
        version?: string,
    },
    spellers?: Record<string, Speller>,
    bundles: Record<SpellerBundleType, SpellerBundle> & Record<KeyboardBundleType, KeyboardBundle>,
    consolidated?: Record<string, ConsolidatedLayouts>
}

