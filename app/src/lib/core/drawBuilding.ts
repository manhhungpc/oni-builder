import type { IBuilding, Position } from '@shared/src/interface';
import type { Camera } from 'src/utils/camera';
import { Container, FederatedPointerEvent, Sprite, Application, Graphics } from 'pixi.js';
import { CELL_SIZE, MOUSE_CLICK, PORT } from 'src/lib/constant';
import type { PlacementState } from 'src/interface/building';
import {
    calculateBuildingGridPositions,
    calculateBuildingOffset,
} from 'src/lib/core/positionBuilding';
import { globalState, placedBuildings, gridPosition } from 'src/lib/universal/globalState.svelte';
import { worldToGrid } from 'src/lib/helpers/gridTransform';
import { CONDUIT_TYPE, OVERLAY } from '@shared/src/enum';
import { liquidPorts, gasPorts, powerPorts, logicPorts, conveyorPorts } from 'src/lib/universal/ports.svelte';

// Type for the port handler callback
type PortHandler = (
    x: number,
    y: number,
    portType: PORT,
    portCategory: OVERLAY
) => void;

// Initialize building draw on canvas
function drawBuilding(
    sprite: Sprite,
    building: IBuilding,
    container: Container,
    camera: Camera,
    options?: {
        onPlace?: (gridX: number, gridY: number) => void;
        onCancel?: () => void;
    }
): PlacementState {
    const clickHandler = placeOnGridHandler(building, camera, container, {
        onPlace: options?.onPlace,
        onCancel: options?.onCancel,
    });

    return {
        sprite,
        clickHandler,
    };
}

function placeOnGridHandler(
    buildingData: IBuilding,
    camera: Camera,
    container: Container,
    options: {
        onPlace?: (gridX: number, gridY: number) => void;
        onCancel?: () => void;
    }
): (event: FederatedPointerEvent) => void {
    return (event: FederatedPointerEvent) => {
        const offset = calculateBuildingOffset(buildingData);

        if (event.button === MOUSE_CLICK.LEFT) {
            // Check if placement is valid
            if (!globalState.isValidPlacement) {
                return;
            }
            const worldPos = camera.screenToWorld(event.global.x, event.global.y);
            const { gridX, gridY } = worldToGrid(worldPos);

            // Create permanent building
            let buildingSprite = Sprite.from(buildingData.name);
            buildingSprite.position.set(
                (gridX + offset.x) * CELL_SIZE,
                (gridY + offset.y) * CELL_SIZE
            );
            buildingSprite.width = buildingData.width * CELL_SIZE;
            buildingSprite.height = buildingData.height * CELL_SIZE;
            buildingSprite.zIndex = buildingData.scene_layer;
            container.addChild(buildingSprite);
            const buildingWorldPosition = calculateBuildingGridPositions(
                buildingData,
                gridX,
                gridY
            );

            placedBuildings.push({
                display_name: buildingData.display_name,
                category: buildingData.category || '',
                object_layer: buildingData.object_layer,
                scene_layer: buildingData.scene_layer,
                tile_layer: buildingData.tile_layer,
                view_mode: buildingData.view_mode ?? 0,
                top_left: buildingWorldPosition.topLeft,
                bottom_right: buildingWorldPosition.bottomRight,
            });

            positionPort(buildingData, gridX, gridY, setPortToGrid);

            options.onPlace?.(gridX, gridY);
        } else if (event.button === MOUSE_CLICK.RIGHT) {
            if (options.onCancel) options.onCancel();
        }
    };
}

const setPortToGrid: PortHandler = (
    x: number,
    y: number,
    portType: PORT,
    portCategory: OVERLAY
) => {
    const key = `${x},${y}`;
    switch (portCategory) {
        case OVERLAY.VENTILATION:
            gasPorts.set(key, portType);
            break;
        case OVERLAY.PLUMBING:
            liquidPorts.set(key, portType);
            break;
        case OVERLAY.POWER:
            powerPorts.set(key, portType);
            break;
        case OVERLAY.AUTOMATION:
            logicPorts.set(key, portType);
            break;
        case OVERLAY.SHIPPING:
            conveyorPorts.set(key, portType);
            break;
    }
};

function positionPort(building: IBuilding, gridX: number, gridY: number, portHandler: PortHandler) {
    if (building.conduit) {
        const isGasConduit =
            building.conduit.input_type === CONDUIT_TYPE.GAS ||
            building.conduit.output_type === CONDUIT_TYPE.GAS;
        const isLiquidConduit =
            building.conduit.input_type === CONDUIT_TYPE.LIQUID ||
            building.conduit.output_type === CONDUIT_TYPE.LIQUID;

        if (building.conduit.input_offset) {
            const inputPort = calculatePortOffset(
                { x: gridX, y: gridY },
                building.conduit.input_offset
            );

            if (isGasConduit) {
                portHandler(inputPort.x, inputPort.y, PORT.INPUT, OVERLAY.VENTILATION);
            }
            if (isLiquidConduit) {
                portHandler(inputPort.x, inputPort.y, PORT.INPUT, OVERLAY.PLUMBING);
            }
        }

        if (building.conduit.output_offset) {
            const outputPort = calculatePortOffset(
                { x: gridX, y: gridY },
                building.conduit.output_offset
            );

            // Step 6: Add to appropriate port map based on conduit type
            if (isGasConduit) {
                portHandler(outputPort.x, outputPort.y, PORT.OUTPUT, OVERLAY.VENTILATION);
            }
            if (isLiquidConduit) {
                portHandler(outputPort.x, outputPort.y, PORT.OUTPUT, OVERLAY.PLUMBING);
            }
        }
    }

    if (building.logic_port && building.logic_port.length > 0) {
        building.logic_port.forEach((port) => {
            const portPosition = calculatePortOffset({ x: gridX, y: gridY }, port.offset);
            const portType = port.type === 'input' ? PORT.INPUT : PORT.OUTPUT;
            portHandler(portPosition.x, portPosition.y, portType, OVERLAY.AUTOMATION);
        });
    }

    if (building.power_port) {
        // Step 11: Process power input ports
        if (building.power_port.input_offset) {
            const inputPort = calculatePortOffset(
                { x: gridX, y: gridY },
                building.power_port.input_offset
            );
            portHandler(inputPort.x, inputPort.y, PORT.INPUT, OVERLAY.POWER);
        }

        // Step 12: Process power output ports
        if (building.power_port.output_offset) {
            const outputPort = calculatePortOffset(
                { x: gridX, y: gridY },
                building.power_port.output_offset
            );
            portHandler(outputPort.x, outputPort.y, PORT.OUTPUT, OVERLAY.POWER);
        }
    }
}

function calculatePortOffset(position: Position, offset: Position) {
    const x = position.x + offset.x;
    const y = position.y - offset.y;

    return { x, y };
}

export { drawBuilding, calculatePortOffset, positionPort };
export type { PortHandler };
