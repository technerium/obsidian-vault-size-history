import {FileCategory} from "./Settings";
import {App} from "obsidian";
import VaultSizeHistoryPlugin from "../../main";
import {
	closestCenter,
	DndContext,
	DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors
} from "@dnd-kit/core";
import {arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy} from "@dnd-kit/sortable";
import {CategoryItem} from "./CategoryItem";
import {publishList, subscribe, unsubscribe} from "../events/CategoryUpdate";
import {NewCategoryForm} from "./NewCategoryForm";


interface CategoryListParams {
	categories: FileCategory[]
	listId: string
	obsidianApp: App
	obsidianPlugin: VaultSizeHistoryPlugin
}

export function CategoryList(props: CategoryListParams) {
	const categories = props.categories

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	)


	const handleDragEnd = (event: DragEndEvent) => {
		const {active, over} = event;

		if (active == null || over == null) {
			return
		}
		if (active.id !== over.id) {
			const newItems = ((items) => {
				const oldIndex = items.findIndex((c) => c.id === active.id)
				const newIndex = items.findIndex((c) => c.id === over.id)
				return arrayMove(items, oldIndex, newIndex);
			})(categories)
			publishList('update-list-' + props.listId, newItems)
		}
	}

	return <div className="technerium-vshp-settings-setting-categories-list">
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragEnd={handleDragEnd}
		>
			<SortableContext
				items={categories}
				strategy={verticalListSortingStrategy}
			>
				{categories.map(c => <CategoryItem key={c.id} category={c}/>)}
			</SortableContext>
		</DndContext>
		<NewCategoryForm isMultiMatch={props.listId == 'multi'}/>
	</div>
}
