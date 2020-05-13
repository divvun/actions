
export interface Speller {
    filename: string
    name_win?: string
}

export type BundleType = "speller_win" | "speller_win_mso" | "speller_macos" | "speller_mobile"
export interface Bundle {
    package: string,
    platform: "windows" | "macos" | "mobile",
    uuid?: string,
    pkg_id?: string,
    repo: string,
}

export interface Manifest {
    package: {
        name: string,
        human_name: string,
        version: string,
    },
    spellers: Record<string, Speller>,
    bundles: Record<BundleType, Bundle>
}

