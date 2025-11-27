import { BasesEntry, Menu, setIcon } from 'obsidian';
import Sortable from 'sortablejs';
import { InternalMenuItem } from 'Types/Internal';
import { EMPTY_GROUP_VALUE } from './BoardViewRenderer';
import { CardView } from './CardView';
import { ColorManager } from './ColorManager';
import { BoardOptions } from './OptionsExtractor';

export interface BoardItem {
    id: string;
    groupId: string;
    subGroupId?: string;
    data: BasesEntry;
}

export interface BoardColumn {
    id: string;
    title: string;
    rawValue: unknown;
    count: number;
}

export interface BoardRow {
    id: string;
    title: string;
    rawValue: unknown;
    count: number;
}

export interface BoardViewData {
    groupPropertyId: string;
    subGroupPropertyId?: string | null;
    columns: BoardColumn[];
    rows: BoardRow[];
    items: Record<string, Record<string, BoardItem[]>>; // groupId -> subGroupId -> items
    cardOptions: BoardOptions;
    cardProperties: string[];
    columnColors: Record<string, string>;
}

export interface BoardViewCallbacks {
    onCardDrop: (itemId: string, groupPropertyId: string, groupPropertyValue: unknown, subGroupPropertyId?: string | null, subGroupPropertyValue?: unknown) => void;
    onHideGroup: (groupValue: string) => void;
    onHideSubGroup: (subGroupValue: string) => void;
    onMoveGroup: (groupValue: string, direction: 'left' | 'right') => void;
    onMoveSubGroup: (subGroupValue: string, direction: 'up' | 'down') => void;
    onSetColumnColor: (groupValue: string, color: string, isSubGroup?: boolean) => void;
    onNewNoteClick: (groupValue: unknown, subGroupValue?: unknown) => Promise<void>;
}

const COLUMN_COLORS = ColorManager.getColorNames().map(name =>
    name.charAt(0).toUpperCase() + name.slice(1)
);

export class BoardView {
    private container: HTMLElement;
    private data: BoardViewData;
    private isDragging = false;

    constructor(container: HTMLElement) {
        this.container = container;
    }

    public render(data: BoardViewData, callbacks: BoardViewCallbacks) {
        this.data = data;

        // Skip render if currently dragging
        if (this.isDragging) {
            return;
        }

        // Capture scroll position
        const existingWrapper = this.container.querySelector('.board-board-wrapper');
        let scrollTop = 0;
        let scrollLeft = 0;
        if (existingWrapper) {
            scrollTop = existingWrapper.scrollTop;
            scrollLeft = existingWrapper.scrollLeft;
        }

        this.container.empty();

        const wrapper = this.container.createDiv('board-board-wrapper');
        if (data.cardOptions.cardSize) {
            wrapper.classList.add(`card-size-${data.cardOptions.cardSize}`);
        }

        // Render Column Headers
        const headerRow = wrapper.createDiv('board-column-headers');
        // Spacer for row headers if rows exist
        if (data.rows.length > 0) {
            headerRow.createDiv('board-column-header-spacer');
        }

        for (const column of data.columns) {
            const header = headerRow.createDiv('board-column-header');

            // Color circle before title (use grey as default)
            if (data.cardOptions.colorHeaders && data.groupPropertyId) {
                const circle = header.createSpan('board-header-color-circle');
                const colorName = this.getColorName(column.id) || 'grey';
                ColorManager.apply(circle, colorName.toLowerCase() as keyof typeof ColorManager.COLOR_MAP);
            }

            // Chip for title (keeping implementation for future use)
            const chip = header.createSpan('board-header-chip');
            chip.textContent = column.title;

            // Count badge
            const countBadge = header.createSpan('board-header-count');
            countBadge.textContent = `${column.count}`;

            // Apply Color to chip (Group Colors) - DISABLED: Using circle instead
            // if (data.cardOptions.colorHeaders && data.groupPropertyId) {
            //     const colorName = this.getColorName(column.id);
            //     if (colorName) {
            //         ColorManager.apply(chip, colorName.toLowerCase() as any);
            //     }
            // }

            // Menu
            const menuBtn = header.createDiv('board-header-menu');
            setIcon(menuBtn, 'more-vertical');
            menuBtn.addEventListener('click', (evt) => {
                evt.stopPropagation();
                const menu = new Menu();

                // Color Menu (Group)
                menu.addItem((item) => {
                    item.setTitle('Color')
                        .setIcon('palette');

                    const subMenu = (item as InternalMenuItem).setSubmenu();
                    COLUMN_COLORS.forEach(colorName => {
                        subMenu.addItem((subItem) => {
                            subItem.setTitle(colorName)
                                .onClick(() => callbacks.onSetColumnColor(column.id, colorName))
                                .setIcon('circle');
                        });
                    });
                });

                menu.addItem((item) => {
                    item.setTitle('Move left')
                        .setIcon('arrow-left')
                        .onClick(() => {
                            callbacks.onMoveGroup(column.id, 'left');
                        });
                });
                menu.addItem((item) => {
                    item.setTitle('Move right')
                        .setIcon('arrow-right')
                        .onClick(() => {
                            callbacks.onMoveGroup(column.id, 'right');
                        });
                });
                menu.addItem((item) => {
                    item.setTitle('Hide group')
                        .setIcon('eye-off')
                        .onClick(() => {
                            callbacks.onHideGroup(column.id);
                        });
                });
                menu.showAtMouseEvent(evt);
            });
        }

        // Container for rows (allows for gallery view)
        const rowsContainer = wrapper.createDiv('board-rows-container');
        const isGallery = !data.groupPropertyId && !!data.subGroupPropertyId;

        if (isGallery) {
            rowsContainer.classList.add('is-gallery');
            const defaultColumn = data.columns.find(c => c.id === EMPTY_GROUP_VALUE) || data.columns[0];

            if (defaultColumn) {
                for (const row of data.rows) {
                    this.renderRow(rowsContainer, row, [defaultColumn], data.items, callbacks);
                }
            }

        } else {
            // Standard Mode
            if (data.rows.length > 0) {
                for (const row of data.rows) {
                    this.renderRow(rowsContainer, row, data.columns, data.items, callbacks);
                }
            } else {
                // Single row (default)
                this.renderRow(rowsContainer, null, data.columns, data.items, callbacks);
            }
        }

        // Restore scroll position
        if (scrollTop > 0 || scrollLeft > 0) {
            wrapper.scrollTop = scrollTop;
            wrapper.scrollLeft = scrollLeft;
        }
    }

    private renderRow(container: HTMLElement, row: BoardRow | null, columns: BoardColumn[], items: Record<string, Record<string, BoardItem[]>>, callbacks: BoardViewCallbacks) {
        const rowWrapper = container.createDiv('board-row-wrapper');

        if (row) {
            const rowHeader = rowWrapper.createDiv('board-row-header-bar');
            const collapseIcon = rowHeader.createSpan('collapse-icon');
            setIcon(collapseIcon, 'chevron-down');

            // Color circle before title (use grey as default)
            if (this.data.cardOptions.colorHeaders && this.data.subGroupPropertyId && !this.data.groupPropertyId) {
                const circle = rowHeader.createSpan('board-header-color-circle');
                const colorName = this.getColorName(row.id, true) || 'grey';
                ColorManager.apply(circle, colorName.toLowerCase() as keyof typeof ColorManager.COLOR_MAP);
            }

            // Chip for title (keeping implementation for future use)
            const chip = rowHeader.createSpan('board-header-chip');
            chip.classList.add('board-row-title');
            chip.textContent = row.title;

            // Count badge
            const countBadge = rowHeader.createSpan('board-header-count');
            countBadge.textContent = `${row.count}`;

            // Apply Color to chip (Sub-Group Colors) - DISABLED: Using circle instead
            // if (this.data.cardOptions.colorHeaders && this.data.subGroupPropertyId && !this.data.groupPropertyId) {
            //     const colorName = this.getColorName(row.id, true);
            //     if (colorName) {
            //         ColorManager.apply(chip, colorName.toLowerCase() as any);
            //     }
            // }

            // Menu
            const menuBtn = rowHeader.createDiv('board-header-menu');
            setIcon(menuBtn, 'more-vertical');
            menuBtn.addEventListener('click', (evt) => {
                evt.stopPropagation();
                const menu = new Menu();

                // Color Menu (Sub-Group) - Only show when no main group property exists
                if (!this.data.groupPropertyId) {
                    menu.addItem((item) => {
                        item.setTitle('Color')
                            .setIcon('palette');

                        const subMenu = (item as InternalMenuItem).setSubmenu();
                        COLUMN_COLORS.forEach(colorName => {
                            subMenu.addItem((subItem) => {
                                subItem.setTitle(colorName)
                                    .onClick(() => callbacks.onSetColumnColor(row.id, colorName, true))
                                    .setIcon('circle');
                            });
                        });
                    });
                }

                menu.addItem((item) => {
                    item.setTitle('Move up')
                        .setIcon('arrow-up')
                        .onClick(() => {
                            callbacks.onMoveSubGroup(row.id, 'up');
                        });
                });
                menu.addItem((item) => {
                    item.setTitle('Move down')
                        .setIcon('arrow-down')
                        .onClick(() => {
                            callbacks.onMoveSubGroup(row.id, 'down');
                        });
                });
                menu.addItem((item) => {
                    item.setTitle('Hide sub-group')
                        .setIcon('eye-off')
                        .onClick(() => {
                            callbacks.onHideSubGroup(row.id);
                        });
                });
                menu.showAtMouseEvent(evt);
            });

            rowHeader.addEventListener('click', () => {
                rowWrapper.classList.toggle('collapsed');
            });
        }

        const rowEl = rowWrapper.createDiv('board-row');
        const rowCells = rowEl.createDiv('board-row-cells');

        for (const column of columns) {
            const cell = rowCells.createDiv('board-cell');
            cell.setAttribute('data-group-id', column.id);
            if (row) {
                cell.setAttribute('data-subgroup-id', row.id);
            }

            // Determine color source (Group > Sub-Group), default to grey
            let effectiveColorName = 'grey';
            if (this.data.groupPropertyId) {
                effectiveColorName = this.getColorName(column.id) || 'grey';
            } else if (this.data.subGroupPropertyId && row) {
                effectiveColorName = this.getColorName(row.id, true) || 'grey';
            }
            // Apply colors based on options
            if (this.data.cardOptions.colorCells) {
                ColorManager.apply(cell, effectiveColorName.toLowerCase() as keyof typeof ColorManager.COLOR_MAP);
            }

            const cardColorMode = this.data.cardOptions.colorCards ? 'minimal' : 'none';

            const cellItems = items[column.id] ? (items[column.id][row ? row.id : 'default'] || []) : [];

            for (const item of cellItems) {
                const cardView = new CardView({
                    options: this.data.cardOptions,
                    properties: this.data.cardProperties,
                    colorName: effectiveColorName,
                    cardColorMode: cardColorMode
                });
                const cardEl = cardView.render(item.data);
                cardEl.setAttribute('data-item-id', item.id);

                // Track mousedown on card to detect drag intention early
                cardEl.addEventListener('mousedown', (evt) => {
                    // Only track left mouse button
                    if (evt.button === 0) {
                        this.isDragging = true;

                        // Set up one-time mouseup listener to clear flag if drag doesn't start
                        const clearFlag = () => {
                            setTimeout(() => {
                                // Only clear if we're still in the "potential drag" state
                                // SortableJS onStart will have taken over if a real drag happened
                                if (this.isDragging) {
                                    this.isDragging = false;
                                }
                            }, 100);
                            document.removeEventListener('mouseup', clearFlag);
                        };
                        document.addEventListener('mouseup', clearFlag);
                    }
                });

                cell.appendChild(cardEl);
            }

            // Add "New Note" button
            const newNoteBtn = cell.createDiv('board-new-note-button');
            newNoteBtn.textContent = '+ New Note';
            newNoteBtn.addEventListener('click', async () => {
                await callbacks.onNewNoteClick(column.rawValue, row?.rawValue);
            });

            this.setupSortable(cell, callbacks);
        }
    }

    private setupSortable(el: HTMLElement, callbacks: BoardViewCallbacks) {
        Sortable.create(el, {
            group: {
                name: 'board',
                pull: 'clone',
                put: true
            },
            animation: 150,
            sort: false, // Disable sorting to prevent items from shifting
            ghostClass: 'board-sortable-ghost',
            chosenClass: 'board-sortable-chosen',
            onStart: (evt) => {
                evt.from.classList.add('board-drag-source');
            },
            onMove: (evt) => {
                // Clear existing indicators
                document.querySelectorAll('.board-item-drop-target-top, .board-item-drop-target-bottom').forEach(el => {
                    el.classList.remove('board-item-drop-target-top', 'board-item-drop-target-bottom');
                });

                evt.related.classList.add('board-item-drop-target-top');
            },
            onEnd: (evt) => {
                this.isDragging = false;
                // Remove source class
                evt.from.classList.remove('board-drag-source');

                // Cleanup indicators
                document.querySelectorAll('.board-item-drop-target-top, .board-item-drop-target-bottom').forEach(el => {
                    el.classList.remove('board-item-drop-target-top', 'board-item-drop-target-bottom');
                });

                // If dropped in the same list, do nothing (sort is false, so no reordering)
                if (evt.from === evt.to) {
                    return;
                }

                const itemEl = evt.item;
                const itemId = itemEl.getAttribute('data-item-id');

                // When pull: 'clone', the itemEl might be the clone in the new list.
                // We remove it immediately because we rely on the data update to re-render the board.
                // This prevents visual duplication or incorrect state before re-render.
                if (itemEl && itemEl.parentNode) {
                    itemEl.parentNode.removeChild(itemEl);
                }

                const targetCell = evt.to as HTMLElement;
                const newGroupId = targetCell.getAttribute('data-group-id') || null;
                const newSubGroupId = targetCell.getAttribute('data-subgroup-id') || null;

                if (itemId && newGroupId) {
                    // Find column and row to get raw values
                    const column = this.data.columns.find(c => c.id === newGroupId);
                    const row = this.data.rows ? this.data.rows.find(r => r.id === newSubGroupId) : null;

                    const groupValue = column ? column.rawValue : newGroupId;
                    const subGroupValue = row ? row.rawValue : newSubGroupId;

                    callbacks.onCardDrop(itemId, this.data.groupPropertyId, groupValue, this.data.subGroupPropertyId, subGroupValue);
                }
            }
        });
    }

    private getColorName(groupValue: string, isSubGroup = false): string {
        const propertyId = isSubGroup ? this.data.subGroupPropertyId : this.data.groupPropertyId;
        const key = `${propertyId}:${groupValue}`;
        const colorName = this.data.columnColors[key];
        return colorName || '';
    }
}
