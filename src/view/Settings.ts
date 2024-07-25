import {App, PluginSettingTab, Setting} from "obsidian";
import VaultSizeHistoryPlugin from "../../main";

export interface VaultSizeHistoryPluginSettings {
	dateFormat: string;
	markdownGraphEnabled: boolean;
	nonMarkupGraphEnabled: boolean;
	totalGraphEnabled: boolean;
}

export const DEFAULT_SETTINGS: VaultSizeHistoryPluginSettings = {
	dateFormat: 'm/d/yy',
	markdownGraphEnabled: true,
	nonMarkupGraphEnabled: true,
	totalGraphEnabled: true
}

export class MainSettingTab extends PluginSettingTab {
	plugin: VaultSizeHistoryPlugin;

	constructor(app: App, plugin: VaultSizeHistoryPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Vault Size History'});

		new Setting(containerEl)
			.setName('Date Format')
			.setDesc("Define how dates are displayed on the graph. Use 'yyyy','yy' for year, 'mm','m' for month, and 'dd','d' for day.")
			.addText(text => text
				.setPlaceholder('mm/dd/yyyy or m/d/yy')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
				}));

		const creditsSection = containerEl.createEl('div', {
			cls: 'technerium-vshp-settings-credits-section',
		});
		creditsSection.createEl('p');
		creditsSection.createEl('p');
		creditsSection.createEl('p');

		const credits = creditsSection.createEl('p',{
			cls: 'technerium-vshp-settings-credits-p',
		});
		credits.appendText(
			'This plugin has been built using ',
		);


		const echartsLink = credits.createEl('a', {
			href: "https://echarts.apache.org",
			text: 'Apache ECharts'
		});
	}
}

