export const CELL_SIZE = 40;

export const MOUSE_CLICK = {
    LEFT: 0,
    RIGHT: 2,
};

export const CATEGORY = {
    BASE: 'base',
    OXYGEN: 'oxygen',
    POWER: 'power',
    FOOD: 'food',
    PLUMBING: 'plumbing',
    VENTILATION: 'hvac',
    REFINEMENT: 'refining',
    MEDICINE: 'medical',
    FURNITURE: 'furniture',
    STATIONS: 'equipment',
    UTILITIES: 'utilities',
    AUTOMATION: 'automation',
    SHIPPING: 'conveyance',
    ROCKETRY: 'rocketry',
};

/* Enum */

export enum PORT {
    INPUT = 1,
    OUTPUT = 2,
    FILTER = 3,
}

export enum ACTION {
    SELECT = 'Select',
    BUILD = 'Build',
    CUT = 'Cut',
    DELETE = 'Delete',
}
