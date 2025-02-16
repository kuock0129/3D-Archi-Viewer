// types.ts
export type Coordinates = [number, number];

export interface RoomShape {
  type: string;
  coords: Coordinates[];
  degree: number;
  is_closed: boolean;
  is_periodic: boolean;
}

export interface Room {
  room_type: string;
  room_id: string;
  room_name: string;
  room_shape: RoomShape;
  room_inner_shapes: any[]; // Add specific type if inner shapes are used
}

export interface Floor {
  floor_height: number;
  rooms: Room[];
}

export type BuildingData = Floor[];