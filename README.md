# Vault Size History for Obsidian

This [Obsidian](https://obsidian.md/) plugin enables users to visualize the historical growth of your vault by displaying a graph that tracks the number of files over time

[Guide for version 1.0.x](LegacyGuide.md)

![demo_1.png](docs/demo_1.png)

## Usage

Use the Vault Size History button in Ribbon bar to display the graph.

Graph Legend allows to hide/show graphs for different categories of the files. The categories can be configured in the settings.

By clicking on a line name in the legend, you can hide/show the line.

## Settings

### Display Date format

It is possible to change the display format of the dates.

Examples of supported formats:

- mm/dd/yyyy - 01/28/2024
- m/d/yy - 1/28/24
- yyyy-mm-dd - 2024-01-28

### Date property

By default, the plugin uses file creation date defined by the system. As per issue #5, system information might not be reliable due to different reasons like file sync/copy when the file is considered recreated.

It is possible to configure a property to be used instead. The `Date property` setting accepts a frontmatter property name to be used to parse the date from.

#### Date property format

`Date property` field's value is parsed to a valid Date using the format defined in the `Date property format`.

It is empty by default and the parsing will not work until the format is defined.

The plugin uses the `Moment.JS` library which is available in Obsidian to work with the dates. Please refer to the library [documentation](https://momentjs.com/docs/#/parsing/string-format/) for the full list of supported formats.

#### Examples

##### Date formats

`YYYY-MM-DD HH:mm:ss` - 2023-01-31 15:04:49
`MM/DD/YY hh:mm:ssA` - 10/31/2020 03:04:49PM

##### Date property configuration

![demo_2.png](docs/created_date_property_settings.png)

![demo_2.png](docs/created_date_property_example.png)

##### Date formatting options

Year:

`YYYY`: 4-digit year

`YY`: 2-digit year

Month:

`MMMM`: Full month name (e.g., January)

`MMM`: Abbreviated month name (e.g., Jan)

`MM`: 2-digit month (e.g., 01)

`M`: Month number (e.g., 1)

Day of Month:

`DD`: 2-digit day of the month (e.g., 01)

`D`: Day of the month (e.g., 1)

Day of Week:

`dddd`: Full name of the day (e.g., Monday)

`ddd`: Abbreviated name of the day (e.g., Mon)

`dd`: Minimized name of the day (e.g., Mo)

Hour:

`HH`: 2-digit hour in 24-hour format (e.g., 14)

`H`: Hour in 24-hour format (e.g., 14)

`hh`: 2-digit hour in 12-hour format (e.g., 02)

`h`: Hour in 12-hour format (e.g., 2)

Minute:

`mm`: 2-digit minute (e.g., 05)

`m`: Minute (e.g., 5)

Second:

`ss`: 2-digit second (e.g., 09)

`s`: Second (e.g., 9)

AM/PM:

`A`: AM/PM

`a`: am/pm

Timezone:

`Z`: Timezone offset (e.g., +05:00)

`ZZ`: Timezone offset without colon (e.g., +0500)

### Legend Sorting Order

This setting controls the order in which line titles are displayed. It allows you to choose how the legend entries are organized based on the chart values. 

The two options available are:

**Ascending Value**: In this option, the legend entries are sorted so that the lines with the lowest chart values appear first. This means that as you read the legend from left to right, the values represented by each line increase.

**Descending Value**: In this option, the legend entries are sorted so that the lines with the highest chart values appear first. This means that as you read the legend from left to right, the values represented by each line decrease.

### File categories

![demo_2.png](docs/demo_2.png)

File categories section allows to define custom groups of files based on filters. Each category is rendered as a separate line on the graph.

Each category has `name` which is displayed in the legend of the graph.

`Category pattern` field is used to define filter to match files against.

Plugin takes full path to a file within Vault when checking the criterion.

Currently supported types of filters are:

- Plain text e.g. 'Examples'. The plugin will check if full path to a file starts with the specified text.
- List of folders. Define list using format `:in:[Folder Name 1:Folder Name 2:Folder Name 3]` and the plugin will count files in these folders.
- List of folders (negative match). Define list using format `:not_in:[Folder Name 1:Folder Name 2:Folder Name 3]` and the plugin will count files that are not in these folders.
- Regular expression. To define the filter, preface the regular expression with `:regex:`. The plugin applies the expression to the full path to the file, which allows to specify criteria based on folder name, file name or file extension.

There are two types of categories.

#### Exclusive categories

The first matching filter from this list will be used to categorize a file. If a file matches multiple criteria, it will only be counted under the first applicable filter
(topmost). Use grabbing area on the left side of the list to reorder filters.

#### Inclusive categories

A file will be counted under every filter it matches. Order of items in this list does not affect numbers you will see in the graph.

#### Example

Let's say there is a number of files in different folders of the Vault. One of the root folders is called `Periodic Notes`.

The exclusive list of categories is defined as following:

![demo_3.png](docs/demo_3.png)

- Periodic Notes - `Periodic Notes` (this will count all files in the Periodic Notes folder)
- Other Notes - `:regex:.*\.(md)$` (this will count all Notes not matching the first filter)
- Other Files - `:regex:.*$` (this will count all files in the Vault not matching first two filters)

If Other Files filter was the only filter in the list, it would display total number of files in the Vault. But being part of exclusive list in the last place, it will only show a subset of files that do not match other filters from this list.

So what if we want to show the total number of files along with categories defined above? 

This is done using inclusive list. We can use the same filter when specifying a new category in this list:

![demo_4.png](docs/demo_4.png)

- All Files - `:regex:.*$`

This configuration gives us the desired four lines on the graph:

![demo_5.png](docs/demo_5.png)

In this example the numbers from the first three categories stack together to cover all files in the vault also represented by fourth category:

```
Periodic Notes + Other Notes + Other Files = 29 + 75 + 254 = 358

All Files = 358
```

## Feedback
If you encounter any issues or have feedback about the plugin, feel free to open an issue on the [GitHub repository](https://github.com/technerium/obsidian-vault-size-history).

## Acknowledgements

The plugin would not be possible without the community:

- [Obsidian](https://obsidian.md/) is the host application for the plugin.
- Plugin uses [Apache ECharts](https://echarts.apache.org) to render graphs.
