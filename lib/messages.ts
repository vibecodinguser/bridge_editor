export interface Viewport {
  lat: number
  lon: number
  z: number
}

export interface CursorGeo {
  lat: number
  lon: number
}

export type BridgeMessage =
  | { type: "viewport"; payload: Viewport }
  | { type: "cursorGeo"; payload: CursorGeo }
  | { type: "cursorLeave" }
  | { type: "frameRegister"; role: "master" | "slave" }
  | { type: "nakarteLayersChanged"; layers: string }
