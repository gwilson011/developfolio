export interface BonVoyageFolder {
    id: string;
    name: string;
    slug: string;
    floppyImage: string;
    createdTime: string;
    subtitle?: string;
    countryCode?: string;
    images?: FolderImage[];  // Cached images from sync
}

export interface FolderImage {
    id: string;
    name: string;
    url: string;
    caption?: string;
}

export interface FolderDetailResponse {
    ok: boolean;
    data?: {
        folder: BonVoyageFolder;
        images: FolderImage[];
    };
    error?: string;
}

export interface BonVoyageData {
    folders: Record<string, BonVoyageFolder>;
    lastSynced: string;
}

export interface BonVoyageAPIResponse {
    ok: boolean;
    data?: {
        current: BonVoyageFolder | null;
        all: BonVoyageFolder[];
        lastSynced: string;
        fromCache: boolean;
    };
    error?: string;
}
