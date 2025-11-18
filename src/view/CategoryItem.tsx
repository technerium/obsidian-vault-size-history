import React, {useState} from 'react';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {FileCategory} from "./Settings";
import {publish} from "../events/CategoryUpdate";
import {ColorResult, SketchPicker} from 'react-color';
import reactCSS from "reactcss";
import {Button, Dialog, DialogActions, DialogContent} from "@mui/material";

interface SortableItemParams {
	key: number
	category: FileCategory
}

interface _Color {
	r: string,
	g: string,
	b: string,
	a: string,
}

export function CategoryItem(props: SortableItemParams) {
	const [category, setCategory] = useState<FileCategory>(props.category)

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
	} = useSortable({id: category.id});

	const onColorChange = (color: ColorResult) => {
		const updatedCategory = Object.assign({}, category, {'color': color.hex})
		setCategory(updatedCategory)
		publish('update', updatedCategory)
	}

	const onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const updatedCategory = Object.assign({}, category, {'name': event.target.value})
		setCategory(updatedCategory)
		publish('update', updatedCategory)
	}

	const onPatternChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const updatedCategory = Object.assign({}, category, {'pattern': event.target.value})
		setCategory(updatedCategory)
		publish('update', updatedCategory)
	}

	const deleteCategory = () => {
		// console.log('publish delete', category.id)
		publish('delete', category)
	}

	const [displayColorPicker, setDisplayColorPicker] = useState(false)


	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const handleClick = () => {
		setDisplayColorPicker(!displayColorPicker);
	};

	const handleClose = () => {
		setDisplayColorPicker(false);
	};


	const styles = reactCSS({
		'default': {
			color: {
				width: '36px',
				height: '14px',
				borderRadius: '2px',
				background: `${category.color}`,
			},
			swatch: {
				padding: '5px',
				background: '#fff',
				borderRadius: '1px',
				boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
				display: 'inline-block',
				cursor: 'pointer',
			},
		},
	});

	return (
		<div ref={setNodeRef} style={style} >
			<div className="technerium-vshp-settings-category-form">
				<span {...attributes} {...listeners} className="technerium-vshp-settings-category-form-grab-area">|||||</span>
				<div className="technerium-vshp-settings-category-form-color">
					<div style={ styles.swatch } onClick={ handleClick }>
						<div style={ styles.color } />
					</div>
					<Dialog open={displayColorPicker} onClose={()=>{}}>
						<DialogContent>
								<SketchPicker color={ category.color } onChange={ onColorChange } />
						</DialogContent>
						<DialogActions>
							<Button onClick={handleClose}>Close</Button>
						</DialogActions>
					</Dialog>
				</div>

				<div className="technerium-vshp-settings-category-form-name">
					<input type="text" value={category.name} onChange={onNameChange}
							className="technerium-vshp-settings-category-form__input"/>
				</div>

				<div className="technerium-vshp-settings-category-form-pattern">
					<input type="text" value={category.pattern} onChange={onPatternChange}
						   className="technerium-vshp-settings-category-form__input"/>
				</div>

				<div className="technerium-vshp-settings-category-form-actions">
					<button onClick={deleteCategory}>Delete</button>
				</div>

			</div>
		</div>
	);
}
