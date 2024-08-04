import {App, Notice, PluginSettingTab, Setting, TFile} from "obsidian";
import VaultSizeHistoryPlugin from "../../main";
import dateFormat from "dateformat";

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
		const app = this.app
		const plugin = this.plugin;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Date format')
			.setDesc("Define how dates are displayed on the graph. Use 'yyyy','yy' for year, 'mm','m' for month, and 'dd','d' for day.")
			.addText(text => text
				.setPlaceholder('mm/dd/yyyy or m/d/yy')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
				}));


		const reportFilePath = 'VaultFiles.csv'

		new Setting(containerEl)
			.setName('File summary report')
			.setDesc(`Generate a CSV file named "${reportFilePath}" in the root of the Vault containing the list of all files counted by the plugin.`)
			.addButton(btn => btn
				.setButtonText('Generate report')
				.onClick(async (evnt) => {
					const { vault } = app
					const files = vault.getFiles()
					// files.sort()

					new Notice('[Vault size history] Generating CSV report');

					let csvFile = app.vault.getFileByPath(reportFilePath)
					if(csvFile == null) {
						csvFile = await app.vault.create(reportFilePath, '')
					}
					await  app.vault.modify(csvFile, '"File Path", "Created Date"\n')
					for(const file of files) {
						const formattedDate = dateFormat(new Date(file.stat.ctime), plugin.settings.dateFormat)
						await app.vault.append(csvFile, `"${file.path}", ${formattedDate}\n`)
					}

					new Notice('[Vault size history] CSV report has been generated successfully');
				})
			)

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

