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

export enum BUILD_RULE {
    Anywhere = 0,
    OnFloor = 1,
    OnCeiling = 3,
    OnWall = 4,
    InCorner = 5,
    Tile = 6,
    NotInTiles = 7,
    ConduitBridge = 8,
    LogicBridge = 9,
    WireBridge = 10,
    HighWattBridgeTile = 11,
    Rocket = 12,
    OnFoundationRotatable = 14,
}

export enum OVERLAY {
    BUILDING = 0,
    POWER = 1,
    PLUMBING = 2,
    VENTILATION = 3,
    AUTOMATION = 4,
    OXYGEN = 5,
    SHIPPING = 6,
    DECOR = 7,
    LIGHT = 8,
    TEMPERATURE = 9,
    ROOM = 10,
}

export enum CONDUIT_TYPE {
    GAS = 1,
    LIQUID = 2,
    CONVEYOR = 3,
}
