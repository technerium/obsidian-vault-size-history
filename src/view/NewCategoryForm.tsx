import React, {useState} from "react";
import {FileCategory} from "./Settings";
import {publish} from "../events/CategoryUpdate";

interface NewCategoryFormParams {
	isMultiMatch: boolean
}

export function NewCategoryForm(props: NewCategoryFormParams) {

	const [name, setName] = useState<string>('')
	const [pattern, setPattern] = useState<string>('')
	const saveCategory = () => {
		publishCreate(name, pattern)
		setName('')
		setPattern('')
	}

	const publishCreate = (nm: string, ptt: string) => {
		const fileCategory: FileCategory = {
			alwaysApply: props.isMultiMatch,
			color: "#0ded17",
			id: 0,
			name: nm,
			pattern: ptt
		}
		publish('create', fileCategory)
	}

	const addAllFilesCategory = () => {
		publishCreate('All Files', ':regex:.*$')
	}

	const addNotesCategory = () => {
		publishCreate('Notes', ':regex:.*\\.(md)$')
	}

	const addImagesCategory = () => {
		publishCreate('Images', ':regex:.*\\.(gif|png|jpg|jpeg)$')
	}

	const addExcludedFolderCategory = () => {
		publishCreate('Not in ABC folder', ':not_in:[ABC]')
	}

	const addExcludedFoldersCategory = () => {
		publishCreate('Not in ABC, DEF folders', ':not_in:[ABC:DEF]')
	}

	const addIncludedFoldersCategory = () => {
		publishCreate('In ABC, DEF folders', ':in:[ABC:DEF]')
	}

	return <>
		<div className="technerium-vshp-settings-category-form">
			<div className="technerium-vshp-settings-category-form-name">
				<input type="text"
					   placeholder="Category Name"
					   value={name}
					   onChange={(e) => setName(e.target.value)}
					   className="technerium-vshp-settings-category-form__input"/>
			</div>

			<div className="technerium-vshp-settings-category-form-pattern">
				<input type="text"
					   placeholder="Category Pattern"
					   value={pattern}
					   onChange={(e) => setPattern(e.target.value)}
					   className="technerium-vshp-settings-category-form__input"/>
			</div>
			<div className="technerium-vshp-settings-category-form-actions">
				<button onClick={saveCategory}>Save</button>
			</div>
		</div>
		<div className="technerium-vshp-settings-category-form">
			<div className="technerium-vshp-settings-category-form-helper-actions">
				Create from presets:
			</div>
			<div className="technerium-vshp-settings-category-form-helper-container">
				<div className="technerium-vshp-settings-category-form-helper-row">
					<div className="technerium-vshp-settings-category-form-helper-actions">
						<button onClick={addAllFilesCategory}>All Files</button>
					</div>
					<div className="technerium-vshp-settings-category-form-helper-actions">
						<button onClick={addNotesCategory}>Notes</button>
					</div>
					<div className="technerium-vshp-settings-category-form-helper-actions">
						<button onClick={addImagesCategory}>Images</button>
					</div>
				</div>
				<div className="technerium-vshp-settings-category-form-helper-row">
					<div className="technerium-vshp-settings-category-form-helper-actions">
						<button onClick={addExcludedFolderCategory}>Not in folder ABC</button>
					</div>
					<div className="technerium-vshp-settings-category-form-helper-actions">
						<button onClick={addExcludedFoldersCategory}>Not in folders ABC, DEF</button>
					</div>
					<div className="technerium-vshp-settings-category-form-helper-actions">
						<button onClick={addIncludedFoldersCategory}>In Folders ABC, DEF</button>
					</div>
				</div>
			</div>
		</div>
	</>
}
