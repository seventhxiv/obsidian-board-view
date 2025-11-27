import Services from 'Base/Services';
import { getPropertyKeyFromId } from 'Utils';
import { BASES_VIEW_ID } from 'main';
import { BasesView, Notice, QueryController } from 'obsidian';
import { BoardViewDataBuilder } from './BoardDataBuilder';
import { BoardNoteCreator } from './BoardNoteCreator';
import { BoardView, BoardViewCallbacks, BoardViewData } from './BoardView';
import { BoardOptionKeys, BoardOptions, OptionsExtractor } from './OptionsExtractor';

export const EMPTY_GROUP_VALUE = 'Empty Group';

export class BoardViewRenderer extends BasesView {
    readonly type = BASES_VIEW_ID;
    private containerEl: HTMLElement;
    public controller: QueryController;
    private board: BoardView;
    private noteCreator: BoardNoteCreator;
    constructor(controller: QueryController, parentEl: HTMLElement) {
        super(controller);
        this.controller = controller;
        this.containerEl = parentEl.createDiv('board-view');
        const boardContainer = this.containerEl.createDiv('board-board-container');

        // Initialize BoardView
        this.board = new BoardView(boardContainer);
        this.noteCreator = new BoardNoteCreator();
    }

    // Called by Obsidian when Bases data changes
    public onDataUpdated(): void {
        this.noteCreator.processPendingNote();
        this.render();
    }

    render(): void {

        const options = this.extractOptions();
        const boardData = this.extractBoardData(options);

        const callbacks: BoardViewCallbacks = {
            onCardDrop: this.handleCardDrop.bind(this),
            onHideGroup: this.hideGroup.bind(this),
            onHideSubGroup: this.hideSubGroup.bind(this),
            onMoveGroup: this.moveGroup.bind(this),
            onMoveSubGroup: this.moveSubGroup.bind(this),
            onSetColumnColor: this.setColumnColor.bind(this),
            onNewNoteClick: this.handleNewNoteClick.bind(this),
        };
        this.board.render(boardData, callbacks);
    }

    private extractOptions(): BoardOptions {
        const optionsExtractor = new OptionsExtractor(this.config);
        const options = optionsExtractor.extract();
        return options;
    }

    private extractBoardData(options: BoardOptions): BoardViewData {
        const boardViewDataBuilder = new BoardViewDataBuilder(this.data, this.config);
        const boardData = boardViewDataBuilder.build(options);
        return boardData;
    }

    private async handleCardDrop(filePath: string, groupPropertyId: string, groupPropertyValue: unknown, subGroupPropertyId?: string | null, subGroupPropertyValue?: unknown) {
        console.log(`[BoardViewRenderer] Card dropped: ${filePath} -> Group: ${groupPropertyValue}, SubGroup: ${subGroupPropertyValue}`);

        // If drop target has formula group, don't update frontmatter
        if (groupPropertyId.startsWith('formula.') || subGroupPropertyId?.startsWith('formula.')) {
            new Notice('Cannot drop card into formula group');
            return;
        }

        const file = Services.propertyManager.getFile(filePath);
        if (!file) return;

        // Update Group
        if (groupPropertyId && groupPropertyValue !== undefined) {
            const groupPropertyKey = getPropertyKeyFromId(groupPropertyId);
            await Services.propertyManager.updateFrontmatter(file, groupPropertyKey, groupPropertyValue);
        }

        // Update Sub Group
        if (subGroupPropertyId && subGroupPropertyValue !== undefined) {
            const subGroupPropertyKey = getPropertyKeyFromId(subGroupPropertyId);
            await Services.propertyManager.updateFrontmatter(file, subGroupPropertyKey, subGroupPropertyValue);
        }
    }

    private hideGroup(groupValue: string) {
        const currentHidden = (this.config.get(BoardOptionKeys.HIDDEN_GROUPS) as string[]) || [];
        if (!currentHidden.includes(groupValue)) {
            this.config.set(BoardOptionKeys.HIDDEN_GROUPS, [...currentHidden, groupValue]);
        }
    }

    private hideSubGroup(subGroupValue: string) {
        const currentHidden = (this.config.get(BoardOptionKeys.HIDDEN_SUB_GROUPS) as string[]) || [];
        if (!currentHidden.includes(subGroupValue)) {
            this.config.set(BoardOptionKeys.HIDDEN_SUB_GROUPS, [...currentHidden, subGroupValue]);
        }
    }

    private moveGroup(groupValue: string, direction: 'left' | 'right') {
        const options = this.extractOptions();
        // Always reconstruct the current sort order from the board data
        const boardData = this.extractBoardData(options);
        const currentOrder = boardData.columns.map(c => c.id);

        const index = currentOrder.indexOf(groupValue);
        if (index === -1) return;

        const newOrder = [...currentOrder];
        if (direction === 'left') {
            if (index > 0) {
                [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
            }
        } else {
            if (index < newOrder.length - 1) {
                [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
            }
        }

        this.config.set(BoardOptionKeys.GROUP_ORDER, newOrder);
    }

    private moveSubGroup(subGroupValue: string, direction: 'up' | 'down') {
        const options = this.extractOptions();
        // Always reconstruct the current sort order from the board data
        const boardData = this.extractBoardData(options);
        const currentOrder = boardData.rows.map(r => r.id);

        const index = currentOrder.indexOf(subGroupValue);
        if (index === -1) return;

        const newOrder = [...currentOrder];
        if (direction === 'up') {
            if (index > 0) {
                [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
            }
        } else {
            if (index < newOrder.length - 1) {
                [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
            }
        }

        this.config.set(BoardOptionKeys.SUB_GROUP_ORDER, newOrder);
    }

    private async setColumnColor(groupValue: string, color: string, isSubGroup = false) {
        const options = this.extractOptions();
        const propertyId = isSubGroup ? options.subGroupProperty : options.groupProperty;
        if (!propertyId) return;
        const key = `${propertyId}:${groupValue}`;
        Services.settings.columnColors[key] = color;
        await Services.plugin.saveSettings();
        this.render();
    }

    private async handleNewNoteClick(groupValue: unknown, subGroupValue?: unknown): Promise<void> {
        const options = this.extractOptions();
        await this.noteCreator.handleNewNoteClick(
            groupValue,
            subGroupValue,
            options.groupProperty,
            options.subGroupProperty
        );
    }

}