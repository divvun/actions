
export interface Speller {
    filename: string
    name_win?: string
}

export type SpellerBundleType = "speller_win" | "speller_win_mso" | "speller_macos" | "speller_mobile"
export type KeyboardBundleType = "keyboard_android"
export type BundleType = SpellerBundleType | KeyboardBundleType

export interface Bundle {
    package: string,
    platform?: "windows" | "macos" | "mobile",
    uuid?: string,
    pkg_id?: string,
    repo: string,
}

export interface ConsolidatedLayouts {
    git: string,
    branch?: string,
    layouts: string[]
}

export interface Manifest {
    package: {
        name: string,
        human_name: string,
        version: string,
    },
    spellers?: Record<string, Speller>,
    bundles: Record<SpellerBundleType, Bundle> & Record<KeyboardBundleType, {}>,
    consolidated?: Record<string, ConsolidatedLayouts>
}

