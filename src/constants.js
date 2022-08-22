export const START_END_COORDS = { 
    START_NODE_ROW: 23,
    START_NODE_COL: 10,
    END_NODE_ROW: 30,
    END_NODE_COL: 30,
}

export const GRID_SIZE = {
    ROW_SIZE: 22,
    COL_SIZE: 50,
}

export const NODE_STATE = {
    NONE: "",
    FINISH: "node-finish",
    START: "node-start",
    VISITED: "node-visited",
    WALL: "node-wall",
}

export const DELTA = [
            [-1, 0],
    [0, -1],        [0, 1],
            [1, 0],
]