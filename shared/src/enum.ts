export enum GRID_TYPE {
    POWER_CONSUME = 0,
    POWER_PRODUCE = 1,
    GAS_INPUT = 2,
    GAS_OUTPUT = 3,
    LIQUID_INPUT = 4,
    LIQUID_OUTPUT = 5,
    AUTOMATION_INPUT = 6,
    AUTOMATION_OUTPUT = 7,
    SHIPPING_INPUT = 8,
    SHIPPING_OUTPUT = 9,
}

export enum OBJECT_LAYER {
    Building = 1,
    BackBuilding = 2,
    GasPipe = 12,
    GasBridge = 15,
    LiquidPipe = 16,
    LiquidBridge = 19, // Include "Conduction Panel"
    ConveyorRail = 20,
    ConveyorBridge = 23,
    Wire = 26,
    WireBridge = 29,
    LogicGateAndBridge = 30,
    LogicWire = 31, // Include the "Automation Ribbon"
    OilWell = 38,
    Gantry = 39,
}
