import {App, moment, Notice} from "obsidian";
import VaultSizeHistoryPlugin from "../../main";
import {useEffect, useRef, useState} from "react";
import {DEFAULT_SETTINGS, FileCategory, LegendOrder} from "./Settings";
import {CategoryList} from "./CategoryList";
import {subscribe, unsubscribe} from "../events/CategoryUpdate";
import {indexDateFormat} from "../util/Constants";

interface FormProps {
	obsidianApp: App
	plugin: VaultSizeHistoryPlugin
}

export const SettingsForm = (props: FormProps) => {
	const {obsidianApp, plugin} = props;
	const singleMatchListId = 'single';
	const multiMatchListId = 'multi';

	const [dateFormatStr, setDateFormatStr] = useState<string>(plugin.settings.graphDateFormat)
	const [fileDatePropertyStr, setFileDatePropertyStr] = useState<string>(plugin.settings.fileDateProperty)
	const [fileDatePropertyFormatStr, setFileDatePropertyFormatStr] = useState<string>(plugin.settings.fileDatePropertyFormat)
	const [fileIndexEnabled, setFileIndexEnabled] = useState<boolean>(plugin.settings.fileIndexEnabled)
	const [fileDeletionIndexEnabled, setFileDeletionIndexEnabled] = useState<boolean>(plugin.settings.fileDeletionIndexEnabled)
	const [fileIndexPath, setFileIndexPath] = useState<string>(plugin.settings.fileIndexPath)
	const [legendOrder, setLegendOrder] = useState<string>(plugin.settings.legendOrder)
	const [singleMatchCategories, setSingleMatchCategories] =
		useState<FileCategory[]>(plugin.settings.categories.filter(c=>!c.alwaysApply))
	const [multiMatchCategories, setMultiMatchCategories] =
		useState<FileCategory[]>(plugin.settings.categories.filter(c=>c.alwaysApply))
	const [startDateBasedOn, setStartDateBasedOn] = useState<number>(plugin.settings.startDateBasedOn)

	const reportFilePath = 'VaultFiles.csv'

	useEffect(()=>{
		plugin.settings.graphDateFormat = dateFormatStr;
		plugin.saveSettings().then(()=>{})
	}, [dateFormatStr])

	useEffect(()=>{
		plugin.settings.fileDateProperty = fileDatePropertyStr;
		plugin.saveSettings().then(()=>{})
	}, [fileDatePropertyStr])

	useEffect(()=>{
		plugin.settings.fileDatePropertyFormat = fileDatePropertyFormatStr;
		plugin.saveSettings().then(()=>{})
	}, [fileDatePropertyFormatStr])

	useEffect(()=>{
		plugin.settings.fileIndexEnabled = fileIndexEnabled;
		plugin.saveSettings().then(()=>{})
	}, [fileIndexEnabled])

	useEffect(()=>{
		plugin.settings.fileDeletionIndexEnabled = fileDeletionIndexEnabled;
		plugin.saveSettings().then(()=>{})
	}, [fileDeletionIndexEnabled])

	useEffect(()=>{
		plugin.settings.fileIndexPath = fileIndexPath;
		plugin.saveSettings().then(()=>{})
	}, [fileIndexPath])

	useEffect(()=>{
		plugin.settings.legendOrder = legendOrder as LegendOrder;
		plugin.saveSettings().then(()=>{})
	}, [legendOrder])

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


	const rebuildIndex = async ()=> {
		await plugin.fileIndex.updateFileIndex(true)
	}

	const generateReport = async ()=> {
		const { vault , metadataCache} = obsidianApp
		const files = vault.getFiles()
		// files.sort()

		new Notice('[Vault size history] Generating CSV report');

		let csvFile = obsidianApp.vault.getFileByPath(reportFilePath)
		if(csvFile == null) {
			csvFile = await obsidianApp.vault.create(reportFilePath, '')
		}
		await  obsidianApp.vault.modify(csvFile, '"File Path", ' +
			'"Created Date (System)", ' +
			'"Created Date (Property Value)", ' +
			'"Created Date (Property Parsed Date)" \n')
		for(const file of files) {
			// TODO:
			// For system file property use default value of fileDatePropertyFormat if not specified by user
			// For frontmatter properties use fileDatePropertyFormat if specified by user
			const reportDateFormat = indexDateFormat
			const systemFormattedDate = moment(new Date(file.stat.ctime)).format(reportDateFormat)
			let filePropertyDateValue = ''
			let filePropertyParsedValue = ''

			if(fileDatePropertyStr && fileDatePropertyFormatStr){
				const fileCache = metadataCache.getFileCache(file)
				if (fileCache && fileCache.frontmatter) {
					try{
						if(fileCache.frontmatter[fileDatePropertyStr]){
							filePropertyDateValue = fileCache.frontmatter[fileDatePropertyStr]
							const dateMomentJS = moment(filePropertyDateValue, fileDatePropertyFormatStr, true)

							if(dateMomentJS.isValid()){
								filePropertyParsedValue =  moment(new Date(dateMomentJS.toDate())).format(reportDateFormat)
							}else{
								filePropertyParsedValue = 'ERROR'
							}
						}
					}catch (e){
						console.error(e)
						filePropertyDateValue = 'ERROR'
						filePropertyParsedValue = e.message
					}
				}
			}
			await obsidianApp.vault.append(csvFile, `"${file.path}", ${systemFormattedDate}, ${filePropertyDateValue}, ${filePropertyParsedValue}\n`)
		}

		new Notice('[Vault size history] CSV report has been generated successfully');
	}


	return <div className="technerium-vshp-settings-form">
		<h3>Graph</h3>
		<div className="technerium-vshp-settings-setting">
			<div className="technerium-vshp-settings-setting-info">
				<div className="technerium-vshp-settings-setting-info-name">
					Graph date display format
				</div>
				<div className="technerium-vshp-settings-setting-info-desc">
					Define how dates are displayed on the graph. Use 'YYYY','YY' for year, 'MM','M' for month, and
					'DD','D' for day (case sensitive).
				</div>
			</div>
			<div className="technerium-vshp-settings-setting-control">
				<input type="text" spellCheck="false" placeholder="MM/DD/YYYY or M/D/YY"
					   value={dateFormatStr}
					   onChange={(e) => setDateFormatStr(e.target.value)}/>
			</div>
		</div>

		<div className="technerium-vshp-settings-setting">
			<div className="technerium-vshp-settings-setting-info">
				<div className="technerium-vshp-settings-setting-info-name">
					Legend Sorting Order
				</div>
				<div className="technerium-vshp-settings-setting-info-desc">
					Control how line titles are displayed in the legend based on their chart values.
				</div>
			</div>
			<div className="technerium-vshp-settings-setting-control">
				<select defaultValue={legendOrder} onChange={(e) => setLegendOrder(e.target.value)}>
					<option key={LegendOrder.ASCENDING_CHART_VALUE} value={LegendOrder.ASCENDING_CHART_VALUE}>Ascending
						Value
					</option>
					<option key={LegendOrder.DESCENDING_CHART_VALUE}
							value={LegendOrder.DESCENDING_CHART_VALUE}>Descending Value
					</option>
				</select>
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
					Documentation and examples are available on our GitHub page: <a
					href="https://github.com/technerium/obsidian-vault-size-history">Vault Size History for Obsidian</a>
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
					Track file deletion
				</div>
				<div className="technerium-vshp-settings-setting-info-desc">
					Enable tracking of file deletion dates in the graph.
					If enabled, the graph will decrease on the dates when files have been deleted.
					If disabled, the graph is cumulative, meaning it will always increase but will be based on the currently existing files.
					To activate this setting, the <b>Automated file index</b> must be enabled.
				</div>
			</div>
			<div className="technerium-vshp-settings-setting-control">
				<input type="checkbox"
					   disabled={!fileIndexEnabled}
					   checked={fileIndexEnabled && fileDeletionIndexEnabled}
					   onChange={(e) => setFileDeletionIndexEnabled(!fileDeletionIndexEnabled)}/>
			</div>
		</div>


		<div className="technerium-vshp-settings-separator"></div>
		<h3>File metadata</h3>
		<p>
			By default, the plugin relies on the system file creation date.
		</p>
		<p>
			There are two additional ways to define file creation dates: using an index file and using a frontmatter
			property in the notes.
		</p>
		<p>
			If both options are configured, the frontmatter property always takes precedence over the value in the index
			file.
		</p>
		<h4>In-Note date property</h4>
		<div className="technerium-vshp-settings-setting">
			<div className="technerium-vshp-settings-setting-info">
				<div className="technerium-vshp-settings-setting-info-name">
					Date property
				</div>
				<div className="technerium-vshp-settings-setting-info-desc">
					Specify the name of the file property used to read the file creation date. If the property is
					missing, the plugin will default to using the system creation date.
				</div>
			</div>
			<div className="technerium-vshp-settings-setting-control">
				<input type="text" spellCheck="false" placeholder="creation_date"
					   value={fileDatePropertyStr}
					   onChange={(e) => setFileDatePropertyStr(e.target.value)}/>
			</div>
		</div>
		<div className="technerium-vshp-settings-setting">
			<div className="technerium-vshp-settings-setting-info">
				<div className="technerium-vshp-settings-setting-info-name">
					Date property format
				</div>
				<div className="technerium-vshp-settings-setting-info-desc">
					Specify the date format of the date property.
				</div>
			</div>
			<div className="technerium-vshp-settings-setting-control">
				<input type="text" spellCheck="false" placeholder="MM/DD/YYYY or M/D/YY"
					   value={fileDatePropertyFormatStr}
					   onChange={(e) => setFileDatePropertyFormatStr(e.target.value)}/>
			</div>
		</div>
		<h4>Automated file index</h4>
		<div className="technerium-vshp-settings-setting">
			<div className="technerium-vshp-settings-setting-info">
				<div className="technerium-vshp-settings-setting-info-name">
					Enable file index
				</div>
				<div className="technerium-vshp-settings-setting-info-desc">
					Enable tracking of file creation dates in a CSV file
				</div>
			</div>
			<div className="technerium-vshp-settings-setting-control">
				<input type="checkbox"
					   checked={fileIndexEnabled}
					   onChange={(e) => setFileIndexEnabled(!fileIndexEnabled)}/>
			</div>
		</div>

		{fileIndexEnabled && <>
			<div className="technerium-vshp-settings-setting">
				<div className="technerium-vshp-settings-setting-info">
					<div className="technerium-vshp-settings-setting-info-name">
						File creation date index
					</div>
					<div className="technerium-vshp-settings-setting-info-desc">
						Specify path to a csv file containing the file creation date index
					</div>
				</div>
				<div className="technerium-vshp-settings-setting-control">
					<input type="text" spellCheck="false" placeholder="path to file a csv file"
						   value={fileIndexPath}
						   onChange={(e) => setFileIndexPath(e.target.value)}/>
				</div>
			</div>
		</>
		}


		<div className="technerium-vshp-settings-separator"></div>

		<h3>Troubleshooting</h3>

		<div className="technerium-vshp-settings-setting">
			<div className="technerium-vshp-settings-setting-info">
				<div className="technerium-vshp-settings-setting-info-name">
					Rebuild file index now
				</div>
				<div className="technerium-vshp-settings-setting-info-desc">
					Rebuild index of file creation dates now. The index file will be located as specified by the "File
					creation date index" option or in the root of the Vault.
				</div>
			</div>
			<div className="technerium-vshp-settings-setting-control">
				<button onClick={rebuildIndex}>Rebuild index</button>
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
