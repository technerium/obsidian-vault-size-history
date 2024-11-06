import {FileCategory} from "../view/Settings";

function subscribe(eventName: string, listener: EventListener) {
	document.addEventListener(eventName, listener);
}

function unsubscribe(eventName: string, listener: EventListener) {
	document.removeEventListener(eventName, listener);
}

function publish(eventName: string, category: FileCategory) {
	const event = new CustomEvent(eventName, { detail: category });
	document.dispatchEvent(event);
}

function publishList(eventName: string, categories: FileCategory[]) {
	const event = new CustomEvent(eventName, { detail: categories });
	document.dispatchEvent(event);
}

export { publish, publishList, subscribe, unsubscribe};
