const keyMap: Record<string, string> = {
    KeyW: "up",
    ArrowUp: "up",
    KeyA: "left",
    ArrowLeft: "left",
    KeyS: "down",
    ArrowDown: "down",
    KeyD: "right",
    ArrowRight: "right",
};

type KeyName = "up" | "left" | "down" | "right";

interface KeyState {
    pressed: boolean;
}

export class Controller {
    keys: Record<KeyName, KeyState>;

    constructor() {
        this.keys = {
            up: { pressed: false },
            left: { pressed: false },
            down: { pressed: false },
            right: { pressed: false },
        };

        window.addEventListener("keydown", (event) => this.keydownHandler(event));
        window.addEventListener("keyup", (event) => this.keyupHandler(event));
    }

    keydownHandler(event: KeyboardEvent): void {
        // Ignore keyboard events when typing in input fields
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
            return;
        }

        const key = keyMap[event.code] as KeyName;

        if (!key) return;

        this.keys[key].pressed = true;
    }

    keyupHandler(event: KeyboardEvent): void {
        // Ignore keyboard events when typing in input fields
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
            return;
        }

        const key = keyMap[event.code] as KeyName;

        if (!key) return;

        this.keys[key].pressed = false;
    }
}
