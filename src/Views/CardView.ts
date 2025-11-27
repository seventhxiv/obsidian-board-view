import { BasesEntry, Menu, WorkspaceLeaf } from 'obsidian';
import { InternalWorkspace } from 'Types/Internal';
import Services from '../Base/Services';
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

        card.addEventListener('mouseup', async (evt) => {
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
                ColorManager.apply(card, this.colorName.toLowerCase() as keyof typeof ColorManager.COLOR_MAP);
            } else if (this.cardColorMode === 'minimal') {
                ColorManager.applyBorderLine(card, this.colorName.toLowerCase() as keyof typeof ColorManager.COLOR_MAP);
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