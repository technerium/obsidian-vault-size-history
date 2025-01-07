import {App, Notice} from "obsidian";
import VaultSizeHistoryPlugin from "../../main";
import {useEffect, useRef, useState} from "react";
import dateFormat from "dateformat";
import {DEFAULT_SETTINGS, FileCategory} from "./Settings";
import {CategoryList} from "./CategoryList";
import {subscribe, unsubscribe} from "../events/CategoryUpdate";

interface FormProps {
	obsidianApp: App
	plugin: VaultSizeHistoryPlugin
}

export const SettingsForm = (props: FormProps) => {
	const {obsidianApp, plugin} = props;
	const singleMatchListId = 'single';
	const multiMatchListId = 'multi';

	const [dateFormatStr, setDateFormatStr] = useState<string>(plugin.settings.dateFormat)
	const [singleMatchCategories, setSingleMatchCategories] =
		useState<FileCategory[]>(plugin.settings.categories.filter(c=>!c.alwaysApply))
	const [multiMatchCategories, setMultiMatchCategories] =
		useState<FileCategory[]>(plugin.settings.categories.filter(c=>c.alwaysApply))
	const [startDateBasedOn, setStartDateBasedOn] = useState<number>(plugin.settings.startDateBasedOn)

	const reportFilePath = 'VaultFiles.csv'

	useEffect(()=>{
		plugin.settings.dateFormat = dateFormatStr;
		plugin.saveSettings().then(()=>{})
	}, [dateFormatStr])

	useEffect(()=>{
		plugin.settings.startDateBasedOn = startDateBasedOn;
		plugin.saveSettings().then(()=>{})
	}, [startDateBasedOn])

	const refSingleMatchCategories = useRef(singleMatchCategories)
	const refMultiMatchCategories = useRef(multiMatchCategories)
	useEffect(() => {
		refSingleMatchCategories.current = singleMatchCategories
		refMultiMatchCategories.current = multiMatchCategories
	});

	const updateCategory = (category: FileCategory) => {
		// console.log('update category', category)
		let newCategories = [...refSingleMatchCategories.current, ...refMultiMatchCategories.current]
		const idx = newCategories.findIndex(c=> c.id === category.id)
		newCategories[idx] = category
		plugin.settings.categories = newCategories
		plugin.saveSettings().then(()=>{})
		setSingleMatchCategories(newCategories.filter(c=>!c.alwaysApply))
		setMultiMatchCategories(newCategories.filter(c=>c.alwaysApply))
	}

	const createCategory = (category: FileCategory) => {
		// console.log('create category', category)
		let newCategories = [...refSingleMatchCategories.current, ...refMultiMatchCategories.current]
		// console.log('max id among these', ...newCategories)
		category.id = Math.max(...newCategories.map(c => c.id)) + 1
		// console.log('new category id', category.id)
		newCategories.push(category)
		plugin.settings.categories = newCategories
		plugin.saveSettings().then(()=>{})
		setSingleMatchCategories([...newCategories.filter(c=>!c.alwaysApply)])
		setMultiMatchCategories([...newCategories.filter(c=>c.alwaysApply)])
	}

	const deleteCategory = (category: FileCategory) => {
		// console.log('delete category', category)
		let newCategories = [...refSingleMatchCategories.current, ...refMultiMatchCategories.current]
		const idx = newCategories.findIndex(c=> c.id === category.id)
		// console.log('Categories before deletion', [...newCategories])
		newCategories.splice(idx, 1)
		// console.log('Categories after deletion', [...newCategories])
		plugin.settings.categories = newCategories
		plugin.saveSettings().then(()=>{})
		setSingleMatchCategories([...newCategories.filter(c=>!c.alwaysApply)])
		setMultiMatchCategories([...newCategories.filter(c=>c.alwaysApply)])
	}

	const updateSingleMatchList = (list: FileCategory[]) => {
		let newCategories = [...list, ...refMultiMatchCategories.current]
		plugin.settings.categories = newCategories
		plugin.saveSettings().then(()=>{})
		setSingleMatchCategories([...newCategories.filter(c=>!c.alwaysApply)])
		setMultiMatchCategories([...newCategories.filter(c=>c.alwaysApply)])
	}

	const updateMultiMatchList = (list: FileCategory[]) => {
		let newCategories = [...refSingleMatchCategories.current, ...list]
		plugin.settings.categories = newCategories
		plugin.saveSettings().then(()=>{})
		setSingleMatchCategories([...newCategories.filter(c=>!c.alwaysApply)])
		setMultiMatchCategories([...newCategories.filter(c=>c.alwaysApply)])
	}

	const resetCategories = () => {
		plugin.settings.categories = DEFAULT_SETTINGS.categories
		plugin.settings.startDateBasedOn = DEFAULT_SETTINGS.startDateBasedOn
		plugin.saveSettings().then(()=>{})
		setSingleMatchCategories([...DEFAULT_SETTINGS.categories.filter(c=>!c.alwaysApply)])
		setMultiMatchCategories([...DEFAULT_SETTINGS.categories.filter(c=>c.alwaysApply)])
	}

	useEffect(() => {
		subscribe("update", (e: CustomEvent) => updateCategory(e.detail));
		subscribe("create", (e: CustomEvent) => createCategory(e.detail));
		subscribe("delete", (e: CustomEvent) => deleteCategory(e.detail));
		subscribe("update-list-" + singleMatchListId, (e: CustomEvent) => updateSingleMatchList(e.detail));
		subscribe("update-list-" + multiMatchListId, (e: CustomEvent) => updateMultiMatchList(e.detail));
		return () => {
			unsubscribe('update', (e: CustomEvent) => updateCategory(e.detail));
			unsubscribe("create", (e: CustomEvent) => createCategory(e.detail));
			unsubscribe("delete", (e: CustomEvent) => deleteCategory(e.detail));
			unsubscribe("update-list-" + singleMatchListId, (e: CustomEvent) => updateSingleMatchList(e.detail));
			unsubscribe("update-list-" + multiMatchListId, (e: CustomEvent) => updateMultiMatchList(e.detail));
		}
	}, []);

	const generateReport = async ()=> {
		const { vault } = obsidianApp
		const files = vault.getFiles()
		// files.sort()

		new Notice('[Vault size history] Generating CSV report');

		let csvFile = obsidianApp.vault.getFileByPath(reportFilePath)
		if(csvFile == null) {
			csvFile = await obsidianApp.vault.create(reportFilePath, '')
		}
		await  obsidianApp.vault.modify(csvFile, '"File Path", "Created Date"\n')
		for(const file of files) {
			const formattedDate = dateFormat(new Date(file.stat.ctime), plugin.settings.dateFormat)
			await obsidianApp.vault.append(csvFile, `"${file.path}", ${formattedDate}\n`)
		}

		new Notice('[Vault size history] CSV report has been generated successfully');
	}


	return <div className="technerium-vshp-settings-form">
		<div className="technerium-vshp-settings-setting">
			<div className="technerium-vshp-settings-setting-info">
				<div className="technerium-vshp-settings-setting-info-name">
					Date format
				</div>
				<div className="technerium-vshp-settings-setting-info-desc">
					Define how dates are displayed on the graph. Use 'yyyy','yy' for year, 'mm','m' for month, and
					'dd','d' for day.
				</div>
			</div>
			<div className="technerium-vshp-settings-setting-control">
				<input type="text" spellCheck="false" placeholder="mm/dd/yyyy or m/d/yy"
					   value={dateFormatStr}
					   onChange={(e) => setDateFormatStr(e.target.value)}/>
			</div>
		</div>
		<div className="technerium-vshp-settings-setting-categories">
			<div className="technerium-vshp-settings-setting-info">
				<div className="technerium-vshp-settings-setting-info-name">
					Exclusive File Categories
				</div>
				<div className="technerium-vshp-settings-setting-info-desc">
					<p>Apply these filters to count each file only once, based on the first criterion it meets. </p>
					<p>If a file matches multiple criteria, it will only be counted under the first applicable filter
						(topmost).</p>
					<p>Folder name can be defined as a filter. For extended filtering, specify regular expression
						following the :regex: prefix.</p>
				</div>
			</div>
		</div>

		<CategoryList categories={singleMatchCategories}
					  obsidianApp={obsidianApp}
					  obsidianPlugin={plugin}
					  listId={singleMatchListId}/>

		<br/>

		<div className="technerium-vshp-settings-setting-categories">
			<div className="technerium-vshp-settings-setting-info">
				<div className="technerium-vshp-settings-setting-info-name">
					Cumulative Filters
				</div>
				<div className="technerium-vshp-settings-setting-info-desc">
					<p>Use these filters to count files multiple times, as each criterion is applied independently.</p>
					<p>A file will be counted under every filter it matches (order does not matter).</p>
					<p>Folder name can be defined as a filter. For extended filtering, specify regular expression
						following the :regex: prefix.</p>
				</div>
			</div>
		</div>


		<CategoryList categories={multiMatchCategories}
					  obsidianApp={obsidianApp}
					  obsidianPlugin={plugin} listId={multiMatchListId}/>

		<div className="technerium-vshp-settings-setting">
			<div className="technerium-vshp-settings-setting-info">
				<div className="technerium-vshp-settings-setting-info-name">
					&nbsp;
				</div>
				<div className="technerium-vshp-settings-setting-info-desc">
					Documentation and examples are available on our GitHub page: <a href="https://github.com/technerium/obsidian-vault-size-history">Vault Size History for Obsidian</a>
				</div>
			</div>
		</div>

		<div className="technerium-vshp-settings-setting">
			<div className="technerium-vshp-settings-setting-info">
				<div className="technerium-vshp-settings-setting-info-name">
					Graph Start
				</div>
				<div className="technerium-vshp-settings-setting-info-desc">
					Choose file category to base start of the graph on.
				</div>
			</div>
			<div className="technerium-vshp-settings-setting-control">
				<select defaultValue={startDateBasedOn} onChange={(e) => setStartDateBasedOn(parseInt(e.target.value))}>
					<option key={-1} value={-1}>Not Selected</option>
					{
						multiMatchCategories.map((c) => {
							return <option key={c.id} value={c.id}>{c.name}</option>
						})
					}
					{
						singleMatchCategories.map((c) => {
							return <option key={c.id} value={c.id}>{c.name}</option>
						})
					}
				</select>
			</div>
		</div>

		<div className="technerium-vshp-settings-setting">
			<div className="technerium-vshp-settings-setting-info">
				<div className="technerium-vshp-settings-setting-info-name">
					Reset categories
				</div>
				<div className="technerium-vshp-settings-setting-info-desc">
					Reset both types of categories and graph start setting to default state.
				</div>
			</div>
			<div className="technerium-vshp-settings-setting-control">
				<button onClick={resetCategories}>Reset categories</button>
			</div>
		</div>

		<div className="technerium-vshp-settings-setting">
			<div className="technerium-vshp-settings-setting-info">
				<div className="technerium-vshp-settings-setting-info-name">
					File summary report
				</div>
				<div className="technerium-vshp-settings-setting-info-desc">
					Generate a CSV file named "{reportFilePath}" in the root of the Vault containing the list of all
					files counted by the plugin.
				</div>
			</div>
			<div className="technerium-vshp-settings-setting-control">
				<button onClick={generateReport}>Generate report</button>
			</div>
		</div>
		<div className="technerium-vshp-settings-setting">
			<div className="technerium-vshp-settings-setting-info">
				<div className="technerium-vshp-settings-setting-info-name">
					&nbsp;
				</div>
				<div className="technerium-vshp-settings-setting-info-desc">
					This plugin has been built using <a href="https://echarts.apache.org">Apache ECharts</a>
				</div>
			</div>
		</div>
	</div>
}

export const createForm = (app: App, plugin: VaultSizeHistoryPlugin) => {
	return <SettingsForm obsidianApp={app} plugin={plugin}></SettingsForm>
}
