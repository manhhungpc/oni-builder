interface Material {
    name: string;
    amount: number;
}

interface Position {
    x: number;
    y: number;
}

interface Conduit {
    input_type?: number | null;
    input_offset?: Position | null;
    output_type?: number | null;
    output_offset?: Position | null;
}

interface LogicPort {
    input_offset?: Position | null;
    output_offset?: Position | null;
}

interface PowerPort {
    type: string;
    consume_amount?: number | null;
    generate_amount?: number | null;
    input_offset?: Position | null;
    output_offset?: Position | null;
}

interface IBuilding {
    id: string;
    name: string;
    display_name: string;
    display_image: string;
    texture_name: string;
    special_texture: string[];
    width: number;
    height: number;
    placement_offset: Position[];
    scene_layer: number;
    object_layer: number;
    tile_layer: number;
    search_term: string[];
    is_drag_build: boolean;
    is_need_foundation: boolean;
    is_foundation: boolean;
    conduit?: Conduit | null;
    logic_port?: LogicPort | null;
    power_port?: PowerPort | null;
    materials: Material[];
    category?: string | null;
    type?: string | null;
}

interface QueryBuildings {
    category?: string;
    search?: string;
}

export { IBuilding, Material, Position, Conduit, LogicPort, PowerPort, QueryBuildings };
