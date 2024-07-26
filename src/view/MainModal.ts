import {App, Modal, TFile} from "obsidian";
import VaultSizeHistoryPlugin from "../../main";
import * as echarts from 'echarts';
import dateFormat, { masks } from 'dateformat';
import {EventCallback} from "zrender/lib/core/Eventful";
import {AnyType} from "@typescript-eslint/type-utils";

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
	'Markdown Files': boolean,
	'Other Files': boolean,
	'All Files': boolean
}

enum ChartLines {
	MarkdownFiles = 'Markdown Files',
	OtherFiles = 'Other Files',
	AllFiles = 'All Files',
}


class GraphData {
	series: Dictionary<number>

	constructor() {
		this.series = {}
	}

	addEntry(dayDate: Date) {
		let counter = this.series[dayDate.getTime()];
		if(!counter)
			counter = 0
		counter++
		this.series[dayDate.getTime()] = counter;
	}

	getEntries(): Dictionary<number> {
		return this.series;
	}
}

export class GraphModal extends Modal {
	plugin: VaultSizeHistoryPlugin;

	constructor(app: App, plugin: VaultSizeHistoryPlugin) {
		super(app);
		this.plugin = plugin
	}

	async onOpen() {
		let { contentEl, modalEl } = this;
		modalEl.addClass("technerium-vshp-graph-modal");

		let graphContainer = document.createElement('div');
		graphContainer.classList.add('technerium-vshp-graph-container');
		contentEl.append(graphContainer)

		type EChartsOption = echarts.EChartsOption;

		let myChart = echarts.init(graphContainer);

		const filesData = (await this.getAllFilesStats()).getEntries()
		const filesDates = Object.keys(filesData).map((key: string) => {return parseInt(key)})
		if(!filesDates)
			return

		const markdownData = (await this.getMarkdownStats()).getEntries()
		const markdownDates = Object.keys(markdownData).map((key: string) => {return parseInt(key)})
		if(!markdownDates)
			return

		filesDates.sort()
		markdownDates.sort()
		const startDate = new Date(markdownDates[0]);
		const endDate = new Date()
		endDate.setHours(12,0,0,0)
		let markdownFilesValues = []
		let nonMarkdownFilesValues = []
		let allFilesValues = []
		let keys = []
		let sumAll = 0
		let sumMarkdown = 0
		let sumNonMarkdown = 0
		for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
			const key = date.getTime()

			while (key >= filesDates[0]){
				filesDates.shift()
				sumAll += filesData[key] ? filesData[key] : 0
			}
			allFilesValues.push(sumAll)
			sumMarkdown += markdownData[key] ? markdownData[key] : 0
			sumNonMarkdown = sumAll - sumMarkdown
			markdownFilesValues.push(sumMarkdown)
			nonMarkdownFilesValues.push(sumNonMarkdown)

			keys.push(dateFormat(date, this.plugin.settings.dateFormat))
		}


		let option: EChartsOption;

		option = {
			title: {
				text: 'Vault Size'
			},
			tooltip: {
				trigger: 'axis'
			},
			legend: {
				data: ['Markdown Files', 'Other Files', 'All Files']
			},
			grid: {
				left: '6%',
				right: '4%',
				bottom: '3%',
				containLabel: false
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
				splitNumber: 10
			},
			series: [
				{
					name: ChartLines.MarkdownFiles,
					type: 'line',
					data: markdownFilesValues
				},
				{
					name: ChartLines.OtherFiles,
					type: 'line',
					data: nonMarkdownFilesValues
				},
				{
					name: ChartLines.AllFiles,
					type: 'line',
					data: allFilesValues
				}
			]
		};

		option && myChart.setOption(option);

		const legendCallback: EventCallback = function (params: EventCallback) {}

		const plugin = this.plugin

		if(!plugin.settings.totalGraphEnabled){
			myChart.dispatchAction({
				type: 'legendToggleSelect',
				name: ChartLines.AllFiles,
			});
		}

		if(!plugin.settings.markdownGraphEnabled){
			myChart.dispatchAction({
				type: 'legendToggleSelect',
				name: ChartLines.MarkdownFiles,
			});
		}

		if(!plugin.settings.nonMarkupGraphEnabled){
			myChart.dispatchAction({
				type: 'legendToggleSelect',
				name: ChartLines.OtherFiles,
			});
		}

		myChart.on('legendselectchanged', function(params: EChartCallbackParams) {
			plugin.settings.markdownGraphEnabled = params.selected[ChartLines.MarkdownFiles]
			plugin.settings.nonMarkupGraphEnabled = params.selected[ChartLines.OtherFiles]
			plugin.settings.totalGraphEnabled = params.selected[ChartLines.AllFiles]
			Promise.all([plugin.saveSettings()])
		});
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}

	async getMarkdownStats(): Promise<GraphData> {
		const { vault } = this.app
		return this.getStats(vault.getMarkdownFiles())
	}

	async getAllFilesStats(): Promise<GraphData> {
		const { vault } = this.app
		return this.getStats(vault.getFiles())
	}

	async getStats(files: TFile[]): Promise<GraphData> {
		let graphData: GraphData = new GraphData();

		const fileDates: number[] = await Promise.all(
			files.map((file) => file.stat.ctime)
		);

		fileDates.forEach((tmstmp) => {
			let date = new Date(tmstmp)
			date.setHours(12,0,0,0);
			graphData.addEntry(date)
		});

		return graphData;
	}
}
