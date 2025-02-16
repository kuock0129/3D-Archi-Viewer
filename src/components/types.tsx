// First, let's define our types in a separate file: types.ts

interface Coords {
    type: string;
    coords: [number, number][];
    degree: number;
    is_closed: boolean;
    is_periodic: boolean;
  }
  
  export interface Room {
    room_type: string;
    room_id: string;
    room_shape: Coords;
    room_inner_shapes: any[];
  }
  
  interface Floor {
    floor_height: number;
    rooms: Room[];
  }
  
  export type BuildingData = Floor[];