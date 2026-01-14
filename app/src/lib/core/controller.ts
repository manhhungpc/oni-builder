const movementKeyMap: Record<string, string> = {
	KeyW: 'up',
	ArrowUp: 'up',
	KeyA: 'left',
	ArrowLeft: 'left',
	KeyS: 'down',
	ArrowDown: 'down',
	KeyD: 'right',
	ArrowRight: 'right'
};

const actionKeyMap: Record<string, string> = {
	KeyO: 'rotate'
};

type KeyName = 'up' | 'left' | 'down' | 'right';
type ActionKeyName = 'rotate';

interface KeyState {
	pressed: boolean;
}

export class Controller {
	keys: Record<KeyName, KeyState>;
	onRotate?: () => void;

	constructor() {
		this.keys = {
			up: { pressed: false },
			left: { pressed: false },
			down: { pressed: false },
			right: { pressed: false }
		};

		window.addEventListener('keydown', (event) => this.keydownHandler(event));
		window.addEventListener('keyup', (event) => this.keyupHandler(event));
	}

	keydownHandler(event: KeyboardEvent): void {
		// Ignore keyboard events when typing in input fields
		const target = event.target as HTMLElement;
		if (
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.contentEditable === 'true'
		) {
			return;
		}

		// Handle movement keys
		const movementKey = movementKeyMap[event.code] as KeyName;
		if (movementKey) {
			this.keys[movementKey].pressed = true;
			return;
		}

		// Handle action keys (single press actions)
		const actionKey = actionKeyMap[event.code] as ActionKeyName;
		if (actionKey === 'rotate' && this.onRotate) {
			this.onRotate();
		}
	}

	keyupHandler(event: KeyboardEvent): void {
		// Ignore keyboard events when typing in input fields
		const target = event.target as HTMLElement;
		if (
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.contentEditable === 'true'
		) {
			return;
		}

		const movementKey = movementKeyMap[event.code] as KeyName;
		if (movementKey) {
			this.keys[movementKey].pressed = false;
		}
	}
}

export function getNextOrientation(currentOrientation: number, rotationPermit: number): number {
	switch (rotationPermit) {
		case 0:
			return 0;
		case 1:
			return currentOrientation === 0 ? 90 : 0; // Toggle 0° <> 90°
		case 2:
			return (currentOrientation + 90) % 360; // Cycle 0 > 90 > 180 > 270 > 0
		case 3:
			return currentOrientation === 0 ? 1 : 0; // Toggle horizontal flip state (0 or 1)
		case 4:
			return currentOrientation === 0 ? 1 : 0; // Toggle vertical flip state (0 or 1)
		default:
			return 0;
	}
}
