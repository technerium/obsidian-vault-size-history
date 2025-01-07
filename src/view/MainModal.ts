import {App, Modal} from "obsidian";
import VaultSizeHistoryPlugin from "../../main";
import * as echarts from 'echarts';
import dateFormat from 'dateformat';
import {FileCategory} from "./Settings";

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

	constructor(category: FileCategory) {
		this.series = {}
		this.category = category
	}

	addEntry(dayDate: Date) {
		let counter = this.series[dayDate.getTime()];
		if(!counter)
			counter = 0
		counter++
		this.series[dayDate.getTime()] = counter;

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

	addEntry(category: FileCategory, dayDate: Date) {
		let normalizedDate = new Date(dayDate);
		normalizedDate.setHours(12,0,0,0)

		let lineData = this.lines.find(ld => ld.category == category)
		if(!lineData){
			lineData = new LineData(category)
			this.lines.push(lineData)
		}
		lineData.addEntry(normalizedDate)

		if([null, -1].contains(this.plugin.settings.startDateBasedOn) || this.plugin.settings.startDateBasedOn == category.id){
			if(this.minDate == null || this.minDate > normalizedDate){
				this.minDate = new Date(normalizedDate)
			}
		}
		if(this.maxDate == null || this.maxDate < normalizedDate){
			this.maxDate = new Date(normalizedDate)
		}
	}

	getLegendStrings(): string[] {
		return this.lines.map(ld=>ld.getCategory().name)
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
		return this.__getDateRange().map(d=> dateFormat(d, this.plugin.settings.dateFormat))
	}

	getEChartSeries(): EChartSeriesitem[] {
		let result = []
		const dateRange = this.__getDateRange()
		for(let line of this.lines) {
			// console.log('Getting line data', line)

			let echartItem: EChartSeriesitem = {
				data: [],
				name: line.category.name,
				type: "line"
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
		const { vault } = this.app
		const plugin = this.plugin
		const allFiles = vault.getFiles()
		const categories = plugin.settings.categories
		let result: GraphData = new GraphData(plugin)

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
				for(const category of matchingCategories){
					result.addEntry(category, fileCDate)
				}
			}
		}

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
