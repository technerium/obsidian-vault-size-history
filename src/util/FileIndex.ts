import Papa, {Parser} from "papaparse";
import {moment, Notice} from "obsidian";
import VaultSizeHistoryPlugin from "../../main";
import {indexDateFormat, indexRefreshTime} from "./Constants";
import {DEFAULT_SETTINGS} from "../view/Settings";

type FileIndexEntry = {
	path: string;
	computedDate: Date;
	isProtected: boolean;
	deletionDate: Date|null;
	additionDate: Date|null;
	systemCreationDate: Date;
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
		this.buildIndexFromFile().then()
		// console.log('Getting file data index')
		return this._index
	}

	init(){
		const thisObj = this

		if(this.refreshInterval){
			clearInterval(this.refreshInterval)
		}

		let intervalMs = indexRefreshTime
		if(this.plugin.settings.fileIndexRefreshInterval > 0){
			intervalMs = this.plugin.settings.fileIndexRefreshInterval * 1000
		}
		this.refreshInterval = setInterval(()=>{
			thisObj.updateIndexFile().then()
		}, intervalMs)
	}

	restartIndexing() {
		// console.log("restarting indexing...")
		const thisObj = this

		if(this.refreshInterval){
			clearInterval(this.refreshInterval)
		}

		let intervalMs = indexRefreshTime
		if(this.plugin.settings.fileIndexRefreshInterval > 0){
			intervalMs = this.plugin.settings.fileIndexRefreshInterval * 1000
		}
		this.refreshInterval = setInterval(()=>{
			thisObj.updateIndexFile().then()
		}, intervalMs)
	}

	destroy() {
		clearInterval(this.refreshInterval)
	}

	async buildIndexFromFile(): Promise<IndexMap>{
		// console.log('Building index from file')
		const obsidianApp = this.plugin.app
		const fileIndexPath = this.plugin.settings.fileIndexPath
		if(!fileIndexPath || !this.plugin.settings.fileIndexEnabled){
			// console.log('File index not enabled or file index path not set')
			this._index = {}
			return this._index
		}
		let csvFile = obsidianApp.vault.getFileByPath(fileIndexPath)
		if(csvFile == null) {
			// console.log('Index file not found')
			// csvFile = await obsidianApp.vault.create(fileIndexPath, '')
			this._index = {}
			return this._index
		}
		let index: IndexMap = {}
		const indexDump = await obsidianApp.vault.read(csvFile)

		const getSafeDate = (dateStr: string, dateFormat: string): Date => {
			if(dateStr){
				let momentObj = moment(dateStr, dateFormat)
				if(momentObj.isValid()){
					return momentObj.toDate()
				}
			}
			return new Date()
		}
		//
		//
		// const debugFileName = `_/${new Date().getTime()}.csv`
		// await obsidianApp.vault.create(debugFileName, indexDump)
		//
		//

		const dateFormat = indexDateFormat
		const defaultDate = new Date()
		if(indexDump){
			Papa.parse<string>(indexDump, {
				complete: function(results) {
					const data = results.data
					for (let i = 1; i < data.length; i++) {
						const row = data[i]
						const filePath = row[0]
						if(!filePath){
							continue
						}
						const computedDate = getSafeDate(row[1], dateFormat)
						const entryProtected = row[2] == 'TRUE'
						const deletionDate = row[3] ? getSafeDate(row[3], dateFormat) : null
						const additionDate = row[4] ? getSafeDate(row[4], dateFormat) : null
						const systemCreationDate = row[5] ? getSafeDate(row[5], dateFormat) : computedDate
						index[filePath] = {
							path: filePath,
							computedDate: computedDate,
							isProtected: entryProtected,
							deletionDate: deletionDate,
							additionDate: additionDate,
							systemCreationDate: systemCreationDate
						}
					}
				}
			})
		}
		this._index = index
		// console.log('Index built from file', index)
		return index
	}

	async updateIndexFile(oneTimeExec = false) {
		// console.log('Updating fileIndex')
		// new Notice('[Vault size history] Updating file index')
		if(!this.plugin.settings.fileIndexEnabled && !oneTimeExec){
			return
		}
		const obsidianApp = this.plugin.app
		const { vault , metadataCache} = obsidianApp
		let fileIndexPath = this.plugin.settings.fileIndexPath
		if(!fileIndexPath){
			if(!oneTimeExec){
				// new Notice('[Vault size history] File index path not configured, cannot rebuild the index')
				return
			}
			fileIndexPath = DEFAULT_SETTINGS.fileIndexPath
		}

		if(oneTimeExec){
			new Notice('[Vault size history] Updating file index');
		}

		let index: IndexMap = await this.buildIndexFromFile()


		// Create index file if it doesn't exist'
		let initializationOfIndex = false
		let csvFile = obsidianApp.vault.getFileByPath(fileIndexPath)
		if(csvFile == null) {
			initializationOfIndex = true
			csvFile = await obsidianApp.vault.create(fileIndexPath, '')
			this.plugin.settings.fileIndexStartedOn = moment(new Date()).format(indexDateFormat);
			this.plugin.saveSettings().then(()=>{
				if(oneTimeExec){
					new Notice('[Vault size history] Created index file at ' + fileIndexPath);
				}
			})
		}

		// Keep file index updated with the last date the index was updated
		let localIndexFileCDate = new Date(csvFile.stat.ctime)

		if(!this.plugin.settings.fileIndexStartedOn ||
			 localIndexFileCDate < moment(this.plugin.settings.fileIndexStartedOn, indexDateFormat).toDate()){
			// Logged index file date is either not set or is older than the current index file date
			this.plugin.settings.fileIndexStartedOn = moment(localIndexFileCDate).format(indexDateFormat);
			this.plugin.saveSettings().then()
		} else {
			localIndexFileCDate = moment(this.plugin.settings.fileIndexStartedOn, indexDateFormat).toDate()
		}

		const files = vault.getFiles()
		const indexedPaths = Object.keys(index)
		const obsidianCachedPaths: string[] = []
		const updatedIndexEntries: FileIndexEntry[] = []

		// Adding all existing files to the index
		for(const file of files) {
			let resultFileCreatedDate = new Date(file.stat.ctime)
			// by default, a file considered added now
			let resultFileAddedDate = new Date()
			// by default, the tracking date is the file added date
			let resultComputedFileDate = resultFileAddedDate
			let fileIsProtected = false

			const indexEntry = index[file.path]
			if(initializationOfIndex) {
				// 	When the index is being initialized, use the creation date of the file as the computed date
				resultFileCreatedDate = new Date(file.stat.ctime)
				resultComputedFileDate = resultFileCreatedDate
				resultFileAddedDate = resultFileCreatedDate
			}else if(indexEntry){
				// File exists in the index, so it was added before
				fileIsProtected = indexEntry.isProtected

				if(resultFileCreatedDate > indexEntry.systemCreationDate){
					// Keep track of the oldest creation date of the file
					resultFileCreatedDate = indexEntry.systemCreationDate
				}

				// index entry added date will be null in the index file from previous version
				let indexEntryAdded = indexEntry.additionDate ? indexEntry.additionDate : resultFileCreatedDate

				if(indexEntryAdded < localIndexFileCDate){
					if(indexEntry.isProtected){
						// We keep the oldest identified creation date
						resultFileAddedDate = resultFileCreatedDate
						// For protected rows computed date is always what is already in the file
						resultComputedFileDate = indexEntry.computedDate
					}else{
						// File was added before vault index was created. Rely on file creation date.
						resultFileAddedDate = resultFileCreatedDate
						resultComputedFileDate = resultFileCreatedDate
					}
				}else{
					// Plugin captured the date in the index when file was added, just use it.
					resultComputedFileDate = indexEntry.computedDate
					resultFileAddedDate = indexEntryAdded
				}
			}else {
				// 	The index exists, and the file was added to the Vault, use today's date as the computed date
				resultFileCreatedDate = new Date(file.stat.ctime)
				resultFileAddedDate = new Date()
				resultComputedFileDate = resultFileAddedDate
			}

			updatedIndexEntries.push(
				{
					path: file.path,
					computedDate: resultComputedFileDate,
					isProtected: fileIsProtected,
					deletionDate: null,
					additionDate: resultFileAddedDate,
					systemCreationDate: resultFileCreatedDate
				}
			)
			obsidianCachedPaths.push(file.path)
		}

		// Counting all files that have been deleted/moved
		const missingFiles = indexedPaths.filter(element => !obsidianCachedPaths.includes(element))
		// console.log('Missing files', missingFiles)
		for(const path of missingFiles){
			const indexEntryDeletedFile = index[path]
			if(!indexEntryDeletedFile.deletionDate){
				indexEntryDeletedFile.deletionDate = new Date()
			}

			if(!indexEntryDeletedFile.additionDate){
				indexEntryDeletedFile.additionDate = indexEntryDeletedFile.computedDate
			}

			updatedIndexEntries.push(indexEntryDeletedFile)
		}

		// Sort index by path i.e. first column
		updatedIndexEntries.sort((a, b)=>{
			if (a.path < b.path) return -1;
			if (a.path > b.path) return 1;
			return 0;
		})

		const updatedSerializedEntries = updatedIndexEntries.map(entry => {
			const {path, computedDate, isProtected, deletionDate, additionDate, systemCreationDate} = entry
			return {
				"File Path": path,
				"Added on Date (Computed)": moment(computedDate).format(indexDateFormat),
				"Protected": isProtected ? 'TRUE' : 'FALSE',
				"Deleted on Date": deletionDate ? moment(deletionDate).format(indexDateFormat) : '',
				"Added on Date (System)": additionDate ? moment(additionDate).format(indexDateFormat) : '',
				"Created on Date (System)": moment(systemCreationDate).format(indexDateFormat)
			}
		})
		const newCSVContent = Papa.unparse(
			updatedSerializedEntries,
			{quotes: true, header: true}
		)

		await obsidianApp.vault.modify(
			csvFile,
			newCSVContent
		)

		if(oneTimeExec){
			new Notice('[Vault size history] Index file updated successfully');
		}
		await this.buildIndexFromFile()
	}
}
