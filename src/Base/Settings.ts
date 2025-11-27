import { App, Plugin, PluginSettingTab } from 'obsidian';

export interface BoardViewSettings {
    columnColors: Record<string, string>;
}

export const DEFAULT_SETTINGS: BoardViewSettings = {
    columnColors: {}
};

export class BoardViewSettingTab extends PluginSettingTab {
    constructor(app: App, plugin: Plugin) {
        super(app, plugin);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
    }
}
