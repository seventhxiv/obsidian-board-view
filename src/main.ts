import { PluginInterface } from 'Base/PluginInterface';
import { BoardViewSettingTab, BoardViewSettings, DEFAULT_SETTINGS } from 'Base/Settings';
import { Plugin, QueryController } from 'obsidian';
import { getPropertyKeyFromId } from 'Utils';
import { BoardViewRenderer } from 'Views/BoardViewRenderer';
import { BoardOptionKeys } from 'Views/OptionsExtractor';
import Services from './Base/Services';

export const BASES_VIEW_ID = 'board-view';

export default class BoardViewPlugin extends Plugin {
	settings: BoardViewSettings;

	async onload() {

		// Load settings
		await this.loadSettings();

		// Initialize services
		await Services.initialize(this);

		// Initialize plugin UI (ribbon icons, commands)
		PluginInterface.initialize();

		// Add settings tab
		this.addSettingTab(new BoardViewSettingTab(this.app, this));

		this.registerBasesView(BASES_VIEW_ID, {
			name: 'Board',
			icon: 'columns',
			factory: (controller: QueryController, containerEl: HTMLElement) => {
				return new BoardViewRenderer(controller, containerEl);
			},
			options: () => ([
				{
					type: 'group',
					displayName: 'Appearance',
					items: [
						{
							type: 'dropdown',
							displayName: 'Card size',
							key: BoardOptionKeys.CARD_SIZE,
							options: { 'small': 'Small (0.5x)', 'medium': 'Medium (0.75x)', 'large': 'Large (1x)' },
							default: 'medium',
							description: 'Scale the card size',
						},
						{
							type: 'property',
							displayName: 'Icon Property',
							key: BoardOptionKeys.ICON_PROPERTY,
							filter: (prop: string) => Services.plugin.isPropertyEligibleForGrouping(prop),
							default: '',
							description: 'Enter the property ID to display as card icon',
						},
						{
							type: 'toggle',
							displayName: 'Open in side view',
							key: BoardOptionKeys.OPEN_IN_SIDE_VIEW,
							default: true,
							description: 'Open file.name in side view',
						},
					]
				},
				{
					type: 'group',
					displayName: 'Colors',
					items: [
						{
							type: 'toggle',
							displayName: 'Color Headers',
							key: BoardOptionKeys.COLOR_HEADERS,
							default: false,
							description: 'Apply color to headers (chips)',
						},
						{
							type: 'toggle',
							displayName: 'Color Cells',
							key: BoardOptionKeys.COLOR_CELLS,
							default: false,
							description: 'Apply color to cells',
						},
						{
							type: 'toggle',
							displayName: 'Color Cards',
							key: BoardOptionKeys.COLOR_CARDS,
							default: false,
							description: 'Apply color to cards (minimal border)',
						},
					]
				},
				{
					type: 'group',
					displayName: 'Group',
					items: [
						{
							type: 'property',
							displayName: 'Group property',
							key: BoardOptionKeys.GROUP_PROPERTY,
							filter: (prop: string) => Services.plugin.isPropertyEligibleForGrouping(prop),
							default: '',
							description: 'Enter the property ID to group columns by',
						},
						{
							type: 'toggle',
							displayName: 'Hide empty groups',
							key: BoardOptionKeys.HIDE_EMPTY_GROUPS,
							default: false,
							description: 'Hide empty groups (columns)',
						},
						{
							type: 'multitext',
							displayName: 'Hidden groups',
							key: BoardOptionKeys.HIDDEN_GROUPS,
							default: [],
							description: 'List of hidden groups',
						},
						{
							type: 'multitext',
							displayName: 'Group order',
							key: BoardOptionKeys.GROUP_ORDER,
							default: [],
							description: 'Order of main group (columns)',
						},
					]
				},
				{
					type: 'group',
					displayName: 'Sub-Group',
					items: [
						{
							type: 'property',
							displayName: 'Sub-group property',
							key: BoardOptionKeys.SUB_GROUP_PROPERTY,
							filter: (prop: string) => Services.plugin.isPropertyEligibleForGrouping(prop),
							default: '',
							description: 'Enter the property ID to group rows by',
						},
						{
							type: 'toggle',
							displayName: 'Hide empty sub groups',
							key: BoardOptionKeys.HIDE_EMPTY_SUB_GROUPS,
							default: false,
							description: 'Hide empty sub group (rows)',
						},
						{
							type: 'multitext',
							displayName: 'Hidden sub-groups',
							key: BoardOptionKeys.HIDDEN_SUB_GROUPS,
							default: [],
							description: 'List of hidden sub-groups',
						},
						{
							type: 'multitext',
							displayName: 'Sub Group order',
							key: BoardOptionKeys.SUB_GROUP_ORDER,
							default: [],
							description: 'Order of sub group (rows)',
						},
					]
				},
				{
					type: 'group',
					displayName: 'Image',
					items: [
						{
							type: 'property',
							displayName: 'Image property',
							key: BoardOptionKeys.IMAGE_PROPERTY,
							filter: (prop: string) => Services.plugin.isPropertyEligibleForGrouping(prop),
							default: '',
							description: 'Enter the property ID to display as card thumbnail',
						},
						{
							type: 'toggle',
							displayName: 'Hide image placeholder',
							key: BoardOptionKeys.HIDE_IMAGE_PLACEHOLDER,
							default: true,
							description: 'Hide grey placeholder if image is missing',
						}
					]
				},
			]),
		});
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	isPropertyEligibleForGrouping(prop: string) {
		if (prop.startsWith('file.')) return false;
		const propKey = getPropertyKeyFromId(prop);
		const type = Services.propertyManager.getPropertyType(propKey);
		return type !== 'tags' && type !== 'multitext' && type !== 'aliases';
	}
}
