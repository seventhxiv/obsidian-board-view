import Services from 'Base/Services';
import { PropertyManager } from 'Data/PropertyManager';
import { BasesQueryResult, BasesViewConfig } from 'obsidian';
import { PropertyData } from 'Types/Internal';
import { getPropertyKeyFromId } from 'Utils';
import { BoardColumn, BoardItem, BoardRow, BoardViewData } from './BoardView';
import { EMPTY_GROUP_VALUE } from './BoardViewRenderer';
import { BoardOptions } from './OptionsExtractor';

export class BoardViewDataBuilder {
    constructor(
        private data: BasesQueryResult,
        private config: BasesViewConfig
    ) { }

    build(options: BoardOptions): BoardViewData {
        const items: Record<string, Record<string, BoardItem[]>> = {};
        const columns: BoardColumn[] = [];
        const rows: BoardRow[] = [];

        const groupPropertyId = options.groupProperty;
        const subGroupPropertyId = options.subGroupProperty;
        const hiddenGroups = new Set(options.hiddenGroups || []);
        const hiddenSubGroups = new Set(options.hiddenSubGroups || []);

        const boardViewData: BoardViewData = {
            groupPropertyId: groupPropertyId || '',
            subGroupPropertyId,
            columns,
            rows,
            items,
            cardOptions: options,
            cardProperties: this.config.getOrder(),
            columnColors: Services.settings.columnColors || {}
        };

        // Use this.data.data (flat list of entries)
        const entries = this.data?.data || [];

        // 1. Collect all unique group and subgroup values
        const groupValues = new Map<string, unknown>();
        const subGroupValues = new Map<string, unknown>();

        // From data
        for (const entry of entries) {
            // Main Group
            let groupValStr = EMPTY_GROUP_VALUE;
            let groupValRaw: unknown = null;
            if (groupPropertyId) {
                const val = entry.getValue(groupPropertyId);
                if (val?.isTruthy()) {
                    groupValRaw = (val as PropertyData).data;
                    if (groupValRaw === undefined) {
                        groupValRaw = val.toString();
                    }
                    groupValStr = val.toString();
                }
            }
            if (!groupValues.has(groupValStr)) {
                groupValues.set(groupValStr, groupValRaw);
            }

            // Sub Group
            let subGroupValStr = EMPTY_GROUP_VALUE;
            let subGroupValRaw: unknown = null;
            if (subGroupPropertyId) {
                const val = entry.getValue(subGroupPropertyId);
                if (val?.isTruthy()) {
                    subGroupValRaw = (val as PropertyData).data;
                    if (subGroupValRaw === undefined) {
                        subGroupValRaw = val.toString();
                    }
                    subGroupValStr = val.toString();
                }
            }
            if (!subGroupValues.has(subGroupValStr)) {
                subGroupValues.set(subGroupValStr, subGroupValRaw);
            }
        }

        // From vault (if not hiding empty)
        if (!options.hideEmptyGroups && groupPropertyId) {
            const propertyManager = new PropertyManager();
            const allValues = propertyManager.getPropertyValues(getPropertyKeyFromId(groupPropertyId));
            for (const val of allValues) {
                if (!groupValues.has(val)) {
                    groupValues.set(val, val);
                }
            }
            if (!groupValues.has(EMPTY_GROUP_VALUE)) groupValues.set(EMPTY_GROUP_VALUE, null);
        }

        if (!options.hideEmptySubGroups && subGroupPropertyId) {
            const propertyManager = new PropertyManager();
            const allValues = propertyManager.getPropertyValues(getPropertyKeyFromId(subGroupPropertyId));
            for (const val of allValues) {
                if (!subGroupValues.has(val)) {
                    subGroupValues.set(val, val);
                }
            }
            if (!subGroupValues.has(EMPTY_GROUP_VALUE)) subGroupValues.set(EMPTY_GROUP_VALUE, null);
        }

        // 2. Create Columns and Rows (Sorted)
        const sortedGroupKeys = this.sortGroups(Array.from(groupValues.keys()), options.groupOrder);
        for (const key of sortedGroupKeys) {
            if (!hiddenGroups.has(key)) {
                columns.push({
                    id: key,
                    title: key,
                    rawValue: groupValues.get(key),
                    count: 0
                });
                items[key] = {};
            }
        }

        const sortedSubGroupKeys = this.sortGroups(Array.from(subGroupValues.keys()), options.subGroupOrder);
        for (const key of sortedSubGroupKeys) {
            if (!hiddenSubGroups.has(key)) {
                rows.push({
                    id: key,
                    title: key,
                    rawValue: subGroupValues.get(key),
                    count: 0
                });
            }
        }

        // 3. Populate Items
        for (const entry of entries) {
            // Main Group
            let groupId = EMPTY_GROUP_VALUE;
            if (groupPropertyId) {
                const val = entry.getValue(groupPropertyId);
                if (val?.isTruthy()) {
                    groupId = val.toString();
                } else {
                    groupId = EMPTY_GROUP_VALUE;
                }
            }

            // Sub Group
            let subGroupId = EMPTY_GROUP_VALUE;
            if (subGroupPropertyId) {
                const val = entry.getValue(subGroupPropertyId);
                if (val?.isTruthy()) {
                    subGroupId = val.toString();
                } else {
                    subGroupId = EMPTY_GROUP_VALUE;
                }
            }

            // Skip if hidden
            if (hiddenGroups.has(groupId)) continue;
            if (subGroupPropertyId && hiddenSubGroups.has(subGroupId)) continue;

            // Ensure structure exists
            if (!items[groupId]) items[groupId] = {};
            if (!items[groupId][subGroupId]) items[groupId][subGroupId] = [];

            items[groupId][subGroupId].push({
                id: entry.file.path,
                groupId: groupId,
                subGroupId: subGroupId === 'default' ? undefined : subGroupId,
                data: entry
            });
        }

        // 4. Calculate Counts
        for (const column of columns) {
            let count = 0;
            if (items[column.id]) {
                for (const subGroupId in items[column.id]) {
                    count += items[column.id][subGroupId].length;
                }
            }
            column.count = count;
        }

        for (const row of rows) {
            let count = 0;
            for (const column of columns) {
                if (items[column.id] && items[column.id][row.id]) {
                    count += items[column.id][row.id].length;
                }
            }
            row.count = count;
        }

        return boardViewData;
    }

    private sortGroups(groups: string[], orderList: string[] | undefined): string[] {
        if (!orderList || orderList.length === 0) {
            return groups.sort();
        }
        const ordered = orderList.filter(g => groups.includes(g));
        const remaining = groups.filter(g => !orderList.includes(g)).sort();
        return [...ordered, ...remaining];
    }
}
