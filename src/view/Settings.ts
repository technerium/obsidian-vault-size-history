import {App, PluginSettingTab} from "obsidian";
import VaultSizeHistoryPlugin from "../../main";
import {createRoot, Root} from "react-dom/client";
import {createForm} from "./SettingsForm";

export interface FileCategory {
	id: number;
	name: string;
	pattern: string;
	color: string;
	alwaysApply: boolean;
}

export enum LegendOrder {
	// Potentially, we can implement order by name, color, rank or other attributes
	ASCENDING_CHART_VALUE = 'ASCENDING_CHART_VALUE',
	DESCENDING_CHART_VALUE = 'DESCENDING_CHART_VALUE',
}

export interface VaultSizeHistoryPluginSettings {
	graphDateFormat: string
	fileDateProperty: string
	fileDatePropertyFormat: string
	fileIndexEnabled: boolean
	fileIndexPath: string
	fileDeletionIndexEnabled: boolean
	legendOrder: LegendOrder
	categories: FileCategory[]
	startDateBasedOn: number
}

export const DEFAULT_SETTINGS: VaultSizeHistoryPluginSettings = {
	graphDateFormat: 'M/D/YY',
	fileDateProperty: '',
	fileDatePropertyFormat: '',
	fileIndexEnabled: false,
	fileDeletionIndexEnabled: false,
	fileIndexPath: 'file_index.csv',
	legendOrder: LegendOrder.ASCENDING_CHART_VALUE,
	categories: [
		{
			id: 1,
			name: "All Files",
			pattern: ":regex:.*$",
			color: "#0ded17",
			alwaysApply: true
		},
		{
			id: 2,
			name: "Notes",
			pattern: ":regex:.*\\.(md)$",
			color: "#ea8383",
			alwaysApply: false
		},
		{
			id: 3,
			name: "Other Files",
			pattern: ":regex:.*$",
			color: "#0dd6a8",
			alwaysApply: false
		}
	],
	startDateBasedOn: -1
}

export class MainSettingTab extends PluginSettingTab {
	plugin: VaultSizeHistoryPlugin;
	reactRoot: Root | null

	constructor(app: App, plugin: VaultSizeHistoryPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		if (!this.reactRoot) {
			this.reactRoot = createRoot(containerEl)
		}
		this.reactRoot.render(createForm(this.app, this.plugin))
	}

	hide(): any {
		if (this.reactRoot) {
			this.reactRoot.unmount()
		}
		this.reactRoot = null
		return super.hide();
	}
}

