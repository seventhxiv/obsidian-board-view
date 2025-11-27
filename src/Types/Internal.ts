import { App, Menu, MenuItem, MetadataCache, TFile, Value, Workspace, WorkspaceLeaf } from "obsidian";

export interface MetadataTypeManager {
    registeredTypeWidgets: Record<string, unknown>;
    properties: Record<string, unknown>;
}

export interface InternalApp extends App {
    metadataTypeManager: MetadataTypeManager;
}

export interface InternalWorkspace extends Workspace {
    iterateRootLeaves(callback: (leaf: WorkspaceLeaf) => boolean | void): void;
    _activeEditor?: {
        file?: TFile;
    };
}

export interface InternalMenuItem extends MenuItem {
    setSubmenu(): Menu;
}

export interface InternalMetadataCache extends MetadataCache {
    getFrontmatterPropertyValuesForKey(key: string): string[];
}

export interface PropertyData extends Value {
    data: unknown;
}
