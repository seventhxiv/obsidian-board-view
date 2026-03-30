import { PropertyNativeType } from 'Data/PropertyManager';
import { InternalApp, PropertyData } from 'Types/Internal';
import { BasesEntry, BasesPropertyId, RenderContext, setIcon } from 'obsidian';
import Services from '../Base/Services';
import { BoardOptions } from './OptionsExtractor';

export interface PropertyViewContext {
    options?: BoardOptions;
}

export class PropertyView {
    private options?: BoardOptions;

    constructor(ctx: PropertyViewContext) {
        this.options = ctx.options;
    }

    render(entry: BasesEntry, propId: BasesPropertyId): HTMLElement | null {

        const propertyName = propId.split(".").slice(1).join(".");
        const value = entry.getValue(propId);
        if (value === null || value === undefined) return null;

        const propertyNativeType = Services.propertyManager.getPropertyType(propertyName);

        const propEl = document.createElement('div');

        if (propId === 'file.name') {

            // Check if we need to render an icon
            const iconProperty = this.options?.iconProperty;
            const iconVal = iconProperty ? entry.getValue(iconProperty) : null;

            if (iconVal?.isTruthy()) {
                // Create container for icon + file name
                propEl.classList.add('board-card-file-name-container');

                // Create icon element
                const iconEl = document.createElement('span');
                iconEl.classList.add('board-card-icon');
                setIcon(iconEl, iconVal.toString());

                // Create file name element
                const fileNameEl = document.createElement('div');
                fileNameEl.classList.add('metadata-property-value', 'card-prop', 'file-name', 'board-card-file-name');
                fileNameEl.classList.add('clickable');
                fileNameEl.textContent = value.toString();

                propEl.appendChild(iconEl);
                propEl.appendChild(fileNameEl);
            } else {
                // No icon, just render file name with padding
                propEl.classList.add('metadata-property-value', 'card-prop', 'file-name', 'board-card-file-name-no-icon');
                propEl.classList.add('clickable');
                propEl.textContent = value.toString();
            }

        } else if (propId.startsWith('file.') || propId.startsWith('formula.')) {
            propEl.classList.add('metadata-property-value', 'card-prop');
            value.renderTo(propEl, new RenderContext());

        } else if (propId.startsWith('note.')) {
            // add parent to propEl with class metadata-property and data-property-key equal to PropertyNativeType
            propEl.classList.add('metadata-property');
            propEl.setAttribute('data-property-key', String(propertyNativeType));

            const child = document.createElement('div');
            child.classList.add('metadata-property-value', 'card-prop');
            propEl.appendChild(child);

            let propertyValue;

            if (!value.isTruthy()) {
                propertyValue = null;
            } else if (propertyNativeType === PropertyNativeType.MULTITEXT || propertyNativeType === PropertyNativeType.TAGS) {
                propertyValue = (value as PropertyData).data;
            } else {
                propertyValue = value.toString();
            }

            const context = {
                app: Services.app,
                blur: () => { },
                key: propertyName,
                onChange: (newValue: string) => {
                    if (newValue === '' && !value.isTruthy()) {
                        return;
                    }
                    void Services.propertyManager.updateFrontmatter(entry.file, propertyName, newValue);
                },
                sourcePath: entry.file.path,
                index: entry.file.name,
            };

            if (propertyNativeType) {
                const widget = (Services.app as InternalApp).metadataTypeManager.registeredTypeWidgets[propertyNativeType];
                (widget as { render: (el: HTMLElement, value: unknown, context: unknown) => void; }).render(child, propertyValue, context);
            }

            // Supercharged Links: apply data-link-* from target file's frontmatter.
            // Obsidian's link widget renders pills as div.internal-link[data-href],
            // so we use a broad attribute selector instead of restricting to <a>.
            for (const link of Array.from(child.querySelectorAll<HTMLElement>('[data-href]'))) {
                const href = link.getAttribute('data-href') || '';
                if (!href) continue;
                applySlAttributes(link, href, entry.file.path);
            }
        }

        return propEl;
    }
}

function applySlAttributes(link: HTMLElement, href: string, sourcePath: string): void {
    const target = Services.app.metadataCache.getFirstLinkpathDest(href, sourcePath);
    if (!target) return;
    const fm = Services.app.metadataCache.getCache(target.path)?.frontmatter;
    if (!fm) return;
    link.classList.add('data-link-icon', 'data-link-icon-after', 'data-link-text');
    for (const [key, val] of Object.entries(fm)) {
        if (key === 'position') continue;
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
            const strVal = String(val);
            link.setAttribute(`data-link-${key}`, strVal);
            link.style.setProperty(`--data-link-${key}`, strVal);
        }
    }
}
