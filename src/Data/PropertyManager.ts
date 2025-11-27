import Services from "Base/Services";
import { TFile } from "obsidian";
import { InternalApp, InternalMetadataCache } from "Types/Internal";

export enum PropertyNativeType {
    TEXT = "text",
    MULTITEXT = "multitext",
    NUMBER = "number",
    CHECKBOX = "checkbox",
    DATE = "date",
    TAGS = "tags",
    ALIASES = "aliases",
}

export class PropertyManager {

    getFile(file: string): TFile | null {
        return Services.app.vault.getFileByPath(file);
    }

    getPropertyType(property: string): string | null {
        try {
            const properties = (Services.app as InternalApp).metadataTypeManager.properties;
            const propertyObject = properties[property.toLowerCase()] as Record<string, unknown>;
            const propertyType = propertyObject['widget'] || null;
            return propertyType as string;
        } catch (e) {
            return null;
        }
    }

    getFrontmatterDate(file: TFile) {
        const cache = Services.app.metadataCache.getFileCache(file);
        return cache?.frontmatter?.myDate;
    }

    async updateFrontmatter(file: TFile, key: string, value: unknown) {
        await Services.app.fileManager.processFrontMatter(file, (fm) => {
            fm[key] = value;
        });
    }

    public getPropertyValues(property: string): string[] {

        let propertyValues = undefined;
        try {
            propertyValues = (Services.app.metadataCache as InternalMetadataCache).getFrontmatterPropertyValuesForKey(property);
        } catch (e) {
            console.log("Error getting property values", e);
        }

        if (propertyValues != undefined) {
            return propertyValues;
        }

        // Otherwise find values manually
        const values = new Set<string>();
        const allFiles = Services.app.vault.getMarkdownFiles();

        allFiles.forEach(file => {
            const cache = Services.app.metadataCache.getFileCache(file);
            const frontmatter = cache?.frontmatter;
            if (!frontmatter) return;

            const value = frontmatter[property];
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    value.forEach(v => values.add(v));
                } else {
                    values.add(value.toString());
                }
            }
        });
        return Array.from(values);
    }
}