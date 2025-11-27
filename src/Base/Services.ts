import { PropertyManager } from 'Data/PropertyManager';
import { App } from 'obsidian';
import BoardViewPlugin from '../main';
import { BoardViewSettings } from './Settings';

export default class Services {
    public static settings: BoardViewSettings;
    public static plugin: BoardViewPlugin;
    public static app: App;
    public static propertyManager: PropertyManager;

    public static initialize(plugin: BoardViewPlugin) {
        this.plugin = plugin;
        this.app = plugin.app;
        this.settings = plugin.settings;
        this.propertyManager = new PropertyManager();
    }
}