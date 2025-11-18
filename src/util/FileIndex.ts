import Papa from "papaparse";
import {moment, Notice} from "obsidian";
import VaultSizeHistoryPlugin from "../../main";
import {indexDateFormat, indexRefreshTime} from "./Constants";
import {DEFAULT_SETTINGS} from "../view/Settings";

type FileIndexEntry = {
	path: string;
	creationDate: Date;
	isProtected: boolean;
	deletionDate: Date|null;
}

type IndexMap = {
	[key: string]: FileIndexEntry;
};

export default class FileIndex {
	plugin: VaultSizeHistoryPlugin
	_index: IndexMap
	refreshInterval: any

	constructor(plugin: VaultSizeHistoryPlugin) {
		this.plugin = plugin
		this._index = {}
	}


	getFileDataIndex(): IndexMap{
		return this._index
	}

	init(){
		const thisObj = this
		this.initIndex().then()
		this.refreshInterval = setInterval(()=>{
			thisObj.updateFileIndex().then()
		}, indexRefreshTime)
	}

	destroy() {
		clearInterval(this.refreshInterval)
	}

	async initIndex(): Promise<IndexMap>{
		const obsidianApp = this.plugin.app
		const fileIndexPath = this.plugin.settings.fileIndexPath
		if(!fileIndexPath || !this.plugin.settings.fileIndexEnabled){
			this._index = {}
			return this._index
		}
		let csvFile = obsidianApp.vault.getFileByPath(fileIndexPath)
		if(csvFile == null) {
			csvFile = await obsidianApp.vault.create(fileIndexPath, '')
		}
		let index: IndexMap = {}
		const indexDump = await obsidianApp.vault.read(csvFile)
		//
		//
		// const debugFileName = `_/${new Date().getTime()}.csv`
		// await obsidianApp.vault.create(debugFileName, indexDump)
		//
		//

		const dateFormat = indexDateFormat
		if(indexDump){
			Papa.parse<string>(indexDump, {
				complete: function(results) {
					const data = results.data
					for (let i = 1; i < data.length; i++) {
						const row = data[i]
						const filePath = row[0]
						const fileDate = moment(row[1], dateFormat).toDate()
						const entryProtected = row[2] == 'TRUE'
						const deletionDate = row[3] ? moment(row[3], dateFormat).toDate() : null
						index[filePath] = {
							path: filePath,
							creationDate: fileDate,
							isProtected: entryProtected,
							deletionDate: deletionDate
						}
					}
				}
			})
		}
		this._index = index
		return index
	}

	async updateFileIndex(oneTimeExec = false) {
		if(!this.plugin.settings.fileIndexEnabled && !oneTimeExec){
			return
		}
		const obsidianApp = this.plugin.app
		const { vault , metadataCache} = obsidianApp
		let fileIndexPath = this.plugin.settings.fileIndexPath
		if(!fileIndexPath){
			if(!oneTimeExec){
				new Notice('[Vault size history] File index path not configured, cannot rebuild the index')
				return
			}
			fileIndexPath = DEFAULT_SETTINGS.fileIndexPath
		}

		if(oneTimeExec){
			new Notice('[Vault size history] Updating file index');
		}

		let index: IndexMap = await this.initIndex()

		let csvFile = obsidianApp.vault.getFileByPath(fileIndexPath)
		if(csvFile == null) {
			csvFile = await obsidianApp.vault.create(fileIndexPath, '')
		}

		const files = vault.getFiles()

		const indexedPaths = Object.keys(index)
		const obsidianCachedPaths: string[] = []
		const updatedIndexEntries: FileIndexEntry[] = []
		for(const file of files) {
			let fileCreatedDate = new Date(file.stat.ctime)

			// console.log(`1. file date ${fileCreatedDate} vs ${index[file.path]}`)
			const indexEntry = index[file.path]
			if(indexEntry && (fileCreatedDate > indexEntry.creationDate || indexEntry.isProtected)){
				fileCreatedDate = indexEntry.creationDate
			}
			updatedIndexEntries.push(
				{
					path: file.path,
					creationDate: fileCreatedDate,
					isProtected: indexEntry ? indexEntry.isProtected : false,
					deletionDate: null
				}
			)
			obsidianCachedPaths.push(file.path)
		}

		const missingFiles = indexedPaths.filter(element => !obsidianCachedPaths.includes(element))
		for(const path of missingFiles){
			const indexEntryDeletedFile = index[path]
			if(!indexEntryDeletedFile.deletionDate){
				indexEntryDeletedFile.deletionDate = new Date()
			}

			updatedIndexEntries.push(indexEntryDeletedFile)
		}
		// Sort index by path i.e. first column
		updatedIndexEntries.sort((a, b)=>{
			if (a.path < b.path) return -1;
			if (a.path > b.path) return 1;
			return 0;
		})

		await  obsidianApp.vault.modify(csvFile, '"File Path",' +
			'"Created Date (System)","Protect Date","Deleted Date"')
		for(const row of updatedIndexEntries){
			const creationDateFormatted = moment(row.creationDate).format(indexDateFormat)
			const isProtectedFormatted = row.isProtected ? 'TRUE' : 'FALSE'
			let deletionDateFormatted = ''
			if(row.deletionDate){
				deletionDateFormatted = moment(row.deletionDate).format(indexDateFormat)
			}

			await obsidianApp.vault.append(
				csvFile,
				`"\n${row.path}",${creationDateFormatted},${isProtectedFormatted},${deletionDateFormatted}`
			)
		}

		if(oneTimeExec){
			new Notice('[Vault size history] Index file updated successfully');
		}
		await this.initIndex()
	}
}
