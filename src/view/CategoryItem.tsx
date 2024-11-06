import React, {useState} from 'react';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {FileCategory} from "./Settings";
import {publish} from "../events/CategoryUpdate";

interface SortableItemParams {
	key: number
	category: FileCategory
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


	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div ref={setNodeRef} style={style} >
			<div className="technerium-vshp-settings-category-form">
				<span {...attributes} {...listeners} className="technerium-vshp-settings-category-form-grab-area">|||||</span>
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
