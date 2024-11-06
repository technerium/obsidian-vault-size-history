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

export interface VaultSizeHistoryPluginSettings {
	dateFormat: string
	categories: FileCategory[]
	startDateBasedOn: number
}

export const DEFAULT_SETTINGS: VaultSizeHistoryPluginSettings = {
	dateFormat: 'm/d/yy',
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
			name: "Periodic Notes",
			pattern: "Periodic Notes",
			color: "#83a7ea",
			alwaysApply: false
		},
		{
			id: 3,
			name: "Other Notes",
			pattern: ":regex:.*\\.(md)$",
			color: "#ea8383",
			alwaysApply: false
		},
		{
			id: 4,
			name: "Other Files",
			// pattern: ":regex:.^.*\\.(?!md$)[^.]+$",
			pattern: ":regex:.*(?!md$)",
			color: "#0dd6a8",
			alwaysApply: false
		},
		{
			id: 5,
			name: "All Notes",
			pattern: ":regex:.*\\.(md)$",
			color: "#ea8383",
			alwaysApply: true
		},
		// {
		// 	id: 6,
		// 	name: "Anything else",
		// 	pattern: ":???:",
		// 	color: "#9b0ded",
		// 	alwaysApply: true
		// }
	],
	startDateBasedOn: -1
}

export class MainSettingTab extends PluginSettingTab {
	plugin: VaultSizeHistoryPlugin;
	reactRoot: Root

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
}

