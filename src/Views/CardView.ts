import { BasesEntry, Menu, Modal, Notice, WorkspaceLeaf } from 'obsidian';
import { InternalWorkspace } from 'Types/Internal';
import Services from '../Base/Services';
import { getPropertyKeyFromId } from 'Utils';
import { ColorManager } from './ColorManager';
import { BoardOptions } from './OptionsExtractor';
import { PropertyView } from './PropertyView';

export interface CardViewContext {
    options: BoardOptions;
    properties: string[]; // properties to display (order)
    colorName?: string | null;
    cardColorMode?: 'none' | 'minimal' | 'full';
}

export class CardView {
    private options: BoardOptions;
    private properties: string[];
    private colorName?: string | null;
    private cardColorMode: 'none' | 'minimal' | 'full';

    constructor(ctx: CardViewContext) {
        this.options = ctx.options;

        // Always ensure file.name is first in the properties list
        const otherProperties = ctx.properties.filter(p => p !== 'file.name');
        this.properties = ['file.name', ...otherProperties];

        this.colorName = ctx.colorName;
        this.cardColorMode = ctx.cardColorMode || 'none';
    }

    render(entry: BasesEntry): HTMLElement {
        const card = document.createElement('div');
        card.classList.add('board-card');
        if (this.options.cardSize) {
            card.classList.add(`card-size-${this.options.cardSize}`);
        }
        card.setAttribute('data-path', entry.file.path);

        card.addEventListener('mouseup', (evt) => {
            void (async () => {
                // Only handle left mouse button
                if (evt.button !== 0) {
                    return;
                }

                // Check if we clicked on an interactive property
                if ((evt.target as HTMLElement).closest('.metadata-property')) {
                    return;
                }

                evt.preventDefault();
                evt.stopPropagation();

                if (this.options.openInSideView) {
                    const workspace = Services.app.workspace;
                    const activeLeaf = workspace.getLeaf(false);
                    let targetLeaf: WorkspaceLeaf | null = null;

                    (workspace as InternalWorkspace).iterateRootLeaves((leaf: WorkspaceLeaf) => {
                        if (leaf !== activeLeaf) {
                            targetLeaf = leaf;
                        }
                    });

                    if (targetLeaf) {
                        workspace.setActiveLeaf(targetLeaf, { focus: true });
                        const newLeaf = workspace.getLeaf('tab');
                        await newLeaf.openFile(entry.file);
                    } else {
                        const newLeaf = workspace.getLeaf('split');
                        await newLeaf.openFile(entry.file);
                    }
                } else {
                    void Services.app.workspace.openLinkText(entry.file.path, '', true);
                }
            })();
        });

        card.addEventListener('contextmenu', (evt) => {
            evt.preventDefault();
            const menu = new Menu();
            Services.app.workspace.trigger("file-menu", menu, entry.file, "board-card");
            menu.showAtPosition({ x: evt.pageX, y: evt.pageY });
        });

        // Apply color based on mode
        if (this.colorName && this.cardColorMode !== 'none') {
            if (this.cardColorMode === 'full') {
                ColorManager.apply(card, this.colorName.toLowerCase());
            } else if (this.cardColorMode === 'minimal') {
                ColorManager.applyBorderLine(card, this.colorName.toLowerCase());
            }
        }

        // optional image
        if (this.options.imageProperty) {
            const imageProperty = entry.getValue(this.options.imageProperty);
            if (imageProperty?.isTruthy()) {
                const data = imageProperty?.toString();
                const imgSrc = String(data);
                const img = document.createElement('img');
                img.classList.add('card-image');
                img.src = imgSrc; // TODO: validate local/remote paths
                card.appendChild(img);
            } else {
                // Placeholder
                if (!this.options.hideImagePlaceholder) {
                    const placeholder = document.createElement('div');
                    placeholder.classList.add('card-image', 'placeholder');
                    card.appendChild(placeholder);
                }
            }
        }

        // ID badge above title
        if (this.options.idProperty) {
            const idPropertyId = this.options.idProperty;
            const idValue = entry.getValue(idPropertyId);
            if (idValue?.isTruthy()) {
                const idText = idValue.toString();
                const idEl = document.createElement('div');
                idEl.classList.add('card-id');
                idEl.textContent = idText;

                idEl.addEventListener('mouseup', (evt) => { evt.stopPropagation(); });

                idEl.addEventListener('click', (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    navigator.clipboard.writeText(idText);
                    new Notice(`Copied: ${idText}`, 1500);
                });

                idEl.addEventListener('contextmenu', (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    const modal = new IdEditModal(Services.app, idText, async (newValue) => {
                        const key = getPropertyKeyFromId(idPropertyId);
                        const file = Services.propertyManager.getFile(entry.file.path);
                        if (file) await Services.propertyManager.updateFrontmatter(file, key, newValue);
                    });
                    modal.open();
                });

                card.appendChild(idEl);
            }
        }

        // create PropertyView helper
        const propertyView = new PropertyView({
            options: this.options
        });

        for (const prop of this.properties) {
            const propEl = propertyView.render(entry, prop as `note.${string}` | `formula.${string}` | `file.${string}`);
            if (propEl) {
                card.appendChild(propEl);
            }
        }

        return card;
    }
}

class IdEditModal extends Modal {
    constructor(
        app: import('obsidian').App,
        private currentValue: string,
        private onSubmit: (newValue: string) => Promise<void>
    ) { super(app); }

    onOpen() {
        const { contentEl, modalEl } = this;
        modalEl.style.width = '280px';
        modalEl.style.minWidth = 'unset';
        contentEl.style.padding = '16px';

        const input = contentEl.createEl('input', { type: 'text' });
        input.value = this.currentValue;
        input.style.width = '100%';
        input.style.marginBottom = '12px';

        const submit = () => { void this.onSubmit(input.value.trim()).then(() => this.close()); };
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') this.close(); });
        contentEl.createEl('button', { text: 'Save' }).addEventListener('click', submit);
        setTimeout(() => { input.focus(); input.select(); }, 50);
    }

    onClose() { this.contentEl.empty(); }
}