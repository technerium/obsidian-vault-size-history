import {App, Modal, moment} from "obsidian";
import VaultSizeHistoryPlugin from "../../main";
import * as echarts from 'echarts';
import {FileCategory, LegendOrder} from "./Settings";

export const GRAPH_MODAL_TYPE = "technerium-vshp-graph-modal";

interface Dictionary<T> {
	[Key: number]: T;
}


interface EChartCallbackParams {
	name: string;
	type: string;
	selected: EChartCallbackSelected
}

interface EChartCallbackSelected {
	'Markdown files': boolean,
	'Other files': boolean,
	'All files': boolean
}


interface EChartSeriesitem{
	name: string
	type: 'line'
	data: number[]
	colorBy: 'series'|'data'
}

enum ChartLines {
	MarkdownFiles = 'Markdown files',
	OtherFiles = 'Other files',
	AllFiles = 'All files',
}


class LineData {
	series: Dictionary<number>
	category: FileCategory
	minDate: Date
	maxDate: Date
	cumulativeTotal: number

	constructor(category: FileCategory) {
		this.series = {}
		this.category = category
		this.cumulativeTotal = 0
	}

	addEntry(dayDate: Date, deletion = false) {
		let counter = this.series[dayDate.getTime()];
		//Increment and store counter for a particular day
		if(!counter)
			counter = 0
		if(deletion){
			counter--
		} else {
			counter++
		}
		this.series[dayDate.getTime()] = counter;

		// Store total number of files in this category for further sorting of legend items
		this.cumulativeTotal++

		if(this.minDate == null || this.minDate > dayDate){
			this.minDate = new Date(dayDate)
		}
		if(this.maxDate == null || this.maxDate < dayDate){
			this.maxDate = new Date(dayDate)
		}
	}

	getEntries(): Dictionary<number> {
		return this.series;
	}

	getCategory(): FileCategory {
		return this.category;
	}
}


class GraphData {
	lines: LineData[] = []
	minDate: Date | null = null
	maxDate: Date | null = null
	plugin: VaultSizeHistoryPlugin
	constructor(plugin: VaultSizeHistoryPlugin) {
		this.plugin = plugin
	}

	orderLines(): void {
		this.lines.sort((a, b) => {
			const factor = this.plugin.settings.legendOrder == LegendOrder.ASCENDING_CHART_VALUE ? 1 : -1
			return (a.cumulativeTotal - b.cumulativeTotal) * factor
		})
	}

	addEntry(category: FileCategory, dayDate: Date, deletion = false) {
		let normalizedDate = new Date(dayDate);
		normalizedDate.setHours(12,0,0,0)

		let lineData = this.lines.find(ld => ld.category == category)
		if(!lineData){
			lineData = new LineData(category)
			this.lines.push(lineData)
		}
		lineData.addEntry(normalizedDate, deletion)

		if([null, -1].contains(this.plugin.settings.startDateBasedOn) || this.plugin.settings.startDateBasedOn == category.id){
			if(this.minDate == null || this.minDate > normalizedDate){
				this.minDate = new Date(normalizedDate)
			}
		}
		if(this.maxDate == null || this.maxDate < normalizedDate){
			this.maxDate = new Date(normalizedDate)
		}

		const todayNormalizedDate = new Date()
		todayNormalizedDate.setHours(12,0,0,0)
		if(this.maxDate < todayNormalizedDate){
			this.maxDate = todayNormalizedDate
		}
	}

	getLegendStrings(): string[] {
		return this.lines.map(ld=>ld.getCategory().name)
	}

	getColors(): string[] {
		return this.lines.map(ld=>ld.getCategory().color)
	}

	__getDateRange(): Date[] {
		if(this.minDate == null)
			this.minDate = this.lines[0].minDate

		if(this.maxDate == null)
			this.maxDate = this.lines[0].maxDate


		let result = []
		for (let date = new Date(this.minDate); date <= this.maxDate; date.setDate(date.getDate() + 1)) {
			result.push(new Date(date))
		}
		return result
	}

	getXScaleItems(): string[] {
		return this.__getDateRange().map(d=> moment(d).format(this.plugin.settings.graphDateFormat))
	}

	getEChartSeries(): EChartSeriesitem[] {
		let result = []
		const dateRange = this.__getDateRange()
		for(let line of this.lines) {
			// console.log('Getting line data', line)

			let echartItem: EChartSeriesitem = {
				data: [],
				name: line.category.name,
				type: "line",
				colorBy: 'series'
			}

			let resultLineNumbers = []
			let lineSumm = 0
			let lineEntries = line.getEntries()
			let lineTimestamps = Object.keys(lineEntries).map((key)=>{return parseInt(key)}).sort()

			for(let date of dateRange){
				const timestampCursor = date.getTime()
				let earliestLineRecord = lineTimestamps[0]
				while(timestampCursor >= earliestLineRecord){
					lineSumm += lineEntries[earliestLineRecord]
					lineTimestamps.shift()
					earliestLineRecord = lineTimestamps[0]
				}
				resultLineNumbers.push(lineSumm)
			}
			echartItem.data = resultLineNumbers
			result.push(echartItem)
		}
		return result
	}
}


export class GraphModal extends Modal {
	plugin: VaultSizeHistoryPlugin;

	constructor(app: App, plugin: VaultSizeHistoryPlugin) {
		super(app);
		this.plugin = plugin
	}


	checkPattern(patternSrc: string, filePath: string): boolean {
		const pattern = patternSrc.trim()
		if(pattern.startsWith(':regex:')){
			try {
				const regex = new RegExp(pattern.replace(':regex:', ''));
				return regex.test(filePath)
			}catch (e){
				return false
			}
		}else if(pattern.startsWith(':in:[') || pattern.startsWith(':not_in:[')){
			let include = pattern.startsWith(':in:[')
			let namesStr = pattern.replace(':in:[', '')
				.replace(':not_in:[', '')
			if(pattern.endsWith(']')){
				namesStr = namesStr.substring(0, namesStr.length - 1)
			}
			const names = namesStr.split(':');
			for(const name of names){
				if(filePath.startsWith(name)){
					return include
				}
			}
			return !include
		}
		return filePath.startsWith(pattern)
	}

	async getGraphData(): Promise<GraphData> {
		const { vault , metadataCache} = this.app
		const plugin = this.plugin
		const allFiles = vault.getFiles()
		const categories = plugin.settings.categories
		const settingDateProperty = plugin.settings.fileDateProperty
		const settingDatePropertyFormat = plugin.settings.fileDatePropertyFormat
		const fileDataIndex = plugin.fileIndex.getFileDataIndex()

		let result: GraphData = new GraphData(plugin)

		// Existing files
		for(const file of allFiles) {
			const filePath = file.path

			let matchingCategories: FileCategory[] = []
			let matchFound = false
			const singleApplyCategories: FileCategory[] = categories.filter(c=> !c.alwaysApply)
			const alwaysApplyCategories: FileCategory[] = categories.filter(c=> c.alwaysApply)

			for(const category of singleApplyCategories) {
				const pattern = category.pattern
				matchFound = this.checkPattern(pattern, filePath)
				if(matchFound) {
					matchingCategories.push(category)
					break
				}
			}

			for(const category of alwaysApplyCategories) {
				const pattern = category.pattern

				if(this.checkPattern(pattern, filePath)){
					matchingCategories.push(category)
				}
			}

			if(matchingCategories){
				let fileCDate = new Date(file.stat.ctime)
				// console.log(`2. file date ${fileCDate} vs ${fileDataIndex[file.path]}`)
				if(fileDataIndex[file.path]){
					fileCDate = fileDataIndex[file.path].creationDate
				}

				try {
					if(settingDateProperty && settingDatePropertyFormat){
						const fileCache = metadataCache.getFileCache(file);
						if (fileCache && fileCache.frontmatter) {
							if(fileCache.frontmatter[settingDateProperty]){
								// console.log(fileCache)
								const dateStr = fileCache.frontmatter[settingDateProperty]
								const dateMomentJS = moment(dateStr, settingDatePropertyFormat, true)

								if(dateMomentJS.isValid()){
									fileCDate = dateMomentJS.toDate()
								}else{
									console.error('[Vault Size History] Creation date property value [' + dateStr + '] of the file [' + file.path + '] could not be parsed using format ' + settingDatePropertyFormat)
								}
							}
						}
					}
				}catch (e){
					console.error("[Vault Size History] Error while processing creation date property of the file ", e)
				}

				for(const category of matchingCategories){
					result.addEntry(category, fileCDate)
				}
			}
		}

		// Deleted files
		if(plugin.settings.fileDeletionIndexEnabled){
			const deletedFilePaths = Object.keys(fileDataIndex).filter(filePath =>
				fileDataIndex[filePath].deletionDate != null
			)
			console.log('Accounting for deleted files', deletedFilePaths)
			for(const filePath of deletedFilePaths){
				let matchingCategories: FileCategory[] = []
				let matchFound = false
				const singleApplyCategories: FileCategory[] = categories.filter(c=> !c.alwaysApply)
				const alwaysApplyCategories: FileCategory[] = categories.filter(c=> c.alwaysApply)

				for(const category of singleApplyCategories) {
					const pattern = category.pattern
					matchFound = this.checkPattern(pattern, filePath)
					if(matchFound) {
						matchingCategories.push(category)
						break
					}
				}

				for(const category of alwaysApplyCategories) {
					const pattern = category.pattern

					if(this.checkPattern(pattern, filePath)){
						matchingCategories.push(category)
					}
				}

				if(matchingCategories){
					const fileCDate = fileDataIndex[filePath].creationDate
					const fileDDate = fileDataIndex[filePath].deletionDate


					for(const category of matchingCategories){
						result.addEntry(category, fileCDate)
						if (fileDDate) {
							result.addEntry(category, fileDDate, true)
						}
					}
				}
			}
		}

		result.orderLines()

		return result
	}

	async onOpen() {
		let {titleEl, contentEl, modalEl} = this;
		modalEl.addClass("technerium-vshp-graph-modal");

		let graphContainer = document.createElement('div');
		graphContainer.classList.add('technerium-vshp-graph-container');
		contentEl.append(graphContainer)
		titleEl.append('Vault size history')


		const backgroundColor = window.getComputedStyle(graphContainer, null).getPropertyValue('background-color')

		const fontColor = window.getComputedStyle(graphContainer, null).getPropertyValue('color')

		type EChartsOption = echarts.EChartsOption;

		let myChart = echarts.init(graphContainer);

		const graphData = await this.getGraphData()
		// console.log('graph data', graphData)

		const legendItems = graphData.getLegendStrings()
		const colors = graphData.getColors()
		const keys = graphData.getXScaleItems()
		const graphSeries = graphData.getEChartSeries()

		// console.log(graphSeries)



		let option: EChartsOption = {
			// title: {
			// 	text: 'Vault size history 11',
			// 	textStyle: {
			// 		color: fontColor,
			// 	}
			// },
			textStyle: {
				color: fontColor,
			},
			tooltip: {
				trigger: 'axis'
			},
			legend: {
				data: legendItems,
				textStyle: {
					color: fontColor,
				}
			},
			grid: {
				left: '10px',
				right: '10px',
				bottom: '10px',
				containLabel: true
			},
			xAxis: {
				type: 'category',
				boundaryGap: false,
				data: keys
			},
			yAxis: {
				type: 'value',
				splitLine: {
					show: true,
					lineStyle: {
						type: 'dashed',
						opacity: 0.3,

					}
				},
				splitNumber: 10,
				axisLabel: {
					align: 'right'
				}
			},
			color: colors,
			series: graphSeries
		};

		myChart.setOption(option);


		// const legendCallback: EventCallback = function (params: EventCallback) {}
		//
		// const plugin = this.plugin
		//
		// if(!plugin.settings.totalGraphEnabled){
		// 	myChart.dispatchAction({
		// 		type: 'legendToggleSelect',
		// 		name: ChartLines.AllFiles,
		// 	});
		// }
		//
		// if(!plugin.settings.markdownGraphEnabled){
		// 	myChart.dispatchAction({
		// 		type: 'legendToggleSelect',
		// 		name: ChartLines.MarkdownFiles,
		// 	});
		// }
		//
		// if(!plugin.settings.nonMarkupGraphEnabled){
		// 	myChart.dispatchAction({
		// 		type: 'legendToggleSelect',
		// 		name: ChartLines.OtherFiles,
		// 	});
		// }
		//
		// myChart.on('legendselectchanged', function(params: EChartCallbackParams) {
		// 	plugin.settings.markdownGraphEnabled = params.selected[ChartLines.MarkdownFiles]
		// 	plugin.settings.nonMarkupGraphEnabled = params.selected[ChartLines.OtherFiles]
		// 	plugin.settings.totalGraphEnabled = params.selected[ChartLines.AllFiles]
		// 	Promise.all([plugin.saveSettings()])
		// });

	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
