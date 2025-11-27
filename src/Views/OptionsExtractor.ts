import { BasesPropertyId, BasesViewConfig } from 'obsidian';
import { getPropertyKeyFromId } from 'Utils';
import Services from '../Base/Services';

export const BoardOptionKeys = {
    GROUP_PROPERTY: 'groupProperty',
    SUB_GROUP_PROPERTY: 'subGroupProperty',
    IMAGE_PROPERTY: 'imageProperty',
    ICON_PROPERTY: 'iconProperty',
    GROUP_ORDER: 'groupOrder',
    SUB_GROUP_ORDER: 'subGroupOrder',
    HIDE_EMPTY_GROUPS: 'hideEmptyGroups',
    HIDE_EMPTY_SUB_GROUPS: 'hideEmptySubGroups',
    CARD_SIZE: 'cardSize',
    OPEN_IN_SIDE_VIEW: 'openInSideView',
    HIDDEN_GROUPS: 'hiddenGroups',
    HIDDEN_SUB_GROUPS: 'hiddenSubGroups',
    HIDE_IMAGE_PLACEHOLDER: 'hideImagePlaceholder',

    // Color Options (simplified)
    COLOR_HEADERS: 'colorHeaders',
    COLOR_CELLS: 'colorCells',
    COLOR_CARDS: 'colorCards',
} as const;

export interface BoardOptions {
    groupProperty?: BasesPropertyId | null;
    subGroupProperty?: BasesPropertyId | null;
    imageProperty?: BasesPropertyId | null;
    iconProperty?: BasesPropertyId | null;
    groupOrder?: string[];
    subGroupOrder?: string[];
    hideEmptyGroups?: boolean;
    hideEmptySubGroups?: boolean;
    cardSize?: 'small' | 'medium' | 'large';
    openInSideView?: boolean;
    hiddenGroups?: string[];
    hiddenSubGroups?: string[];
    hideImagePlaceholder?: boolean;

    // Color Options
    colorHeaders?: boolean;
    colorCells?: boolean;
    colorCards?: boolean; // minimal mode only (left border)
}

export class OptionsExtractor {
    constructor(private config: BasesViewConfig) { }

    extract(): BoardOptions {
        const options: BoardOptions = {};
        let groupProperty = (this.config.get(BoardOptionKeys.GROUP_PROPERTY) as BasesPropertyId | null) || null;
        let subGroupProperty = (this.config.get(BoardOptionKeys.SUB_GROUP_PROPERTY) as BasesPropertyId | null) || null;

        // Validate group property is still eligible
        if (groupProperty) {
            const propKey = getPropertyKeyFromId(groupProperty);
            if (!Services.plugin.isPropertyEligibleForGrouping(propKey)) {
                console.warn(`Group property '${groupProperty}' is no longer eligible for grouping. Clearing it.`);
                this.config.set(BoardOptionKeys.GROUP_PROPERTY, null);
                groupProperty = null;
            }
        }

        // Validate subgroup property is still eligible
        if (subGroupProperty) {
            const propKey = getPropertyKeyFromId(subGroupProperty);
            if (!Services.plugin.isPropertyEligibleForGrouping(propKey)) {
                console.warn(`Sub-group property '${subGroupProperty}' is no longer eligible for grouping. Clearing it.`);
                this.config.set(BoardOptionKeys.SUB_GROUP_PROPERTY, null);
                subGroupProperty = null;
            }
        }

        options.groupProperty = groupProperty;
        options.subGroupProperty = subGroupProperty;
        options.imageProperty = (this.config.get(BoardOptionKeys.IMAGE_PROPERTY) as BasesPropertyId | null) || null;
        options.iconProperty = (this.config.get(BoardOptionKeys.ICON_PROPERTY) as BasesPropertyId | null) || null;
        options.groupOrder = (this.config.get(BoardOptionKeys.GROUP_ORDER) as string[]) || [];
        options.subGroupOrder = (this.config.get(BoardOptionKeys.SUB_GROUP_ORDER) as string[]) || [];
        options.hideEmptyGroups = (this.config.get(BoardOptionKeys.HIDE_EMPTY_GROUPS) as boolean) || false;
        options.hideEmptySubGroups = (this.config.get(BoardOptionKeys.HIDE_EMPTY_SUB_GROUPS) as boolean) || false;
        options.cardSize = (this.config.get(BoardOptionKeys.CARD_SIZE) as 'small' | 'medium' | 'large') || 'medium';
        options.openInSideView = (this.config.get(BoardOptionKeys.OPEN_IN_SIDE_VIEW) as boolean) || true;
        options.hiddenGroups = (this.config.get(BoardOptionKeys.HIDDEN_GROUPS) as string[]) || [];
        options.hiddenSubGroups = (this.config.get(BoardOptionKeys.HIDDEN_SUB_GROUPS) as string[]) || [];
        options.hideImagePlaceholder = (this.config.get(BoardOptionKeys.HIDE_IMAGE_PLACEHOLDER) as boolean) || false;

        // Color Options
        options.colorHeaders = (this.config.get(BoardOptionKeys.COLOR_HEADERS) as boolean) || true;
        options.colorCells = (this.config.get(BoardOptionKeys.COLOR_CELLS) as boolean) || false;
        options.colorCards = (this.config.get(BoardOptionKeys.COLOR_CARDS) as boolean) || true;

        return options;
    }
}
