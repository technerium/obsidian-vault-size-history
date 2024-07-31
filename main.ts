import {Plugin} from 'obsidian';
import {GraphModal, GRAPH_MODAL_TYPE} from "./src/view/MainModal";
import {VaultSizeHistoryPluginSettings, MainSettingTab, DEFAULT_SETTINGS} from "./src/view/Settings";


export default class VaultSizeHistoryPlugin extends Plugin {
	settings: VaultSizeHistoryPluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MainSettingTab(this.app, this));

		this.addCommand({
			id: "open-graph-modal",
			name: "Open graph",
			callback: () => {
				this.activateView()
			},
		});

		this.addRibbonIcon("area-chart", "Vault size history", () => {
			this.activateView();
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

	async activateView() {
		new GraphModal(this.app, this).open();
	}
}


