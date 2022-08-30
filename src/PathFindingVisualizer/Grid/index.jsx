/* eslint-disable no-mixed-operators */
import React, {useState, useEffect, useRef, useCallback} from "react";

// local imports
import {START_END_COORDS, GRID_SIZE, NODE_STATE, ANIMATION_SPEED} from "../../constants"   
import Node from "../Node"
import "./Grid.css";

const Grid = ({isRunning, setIsRunning, algorithm, animationSpeed}) => {
  const [grid, setGrid] = useState([]);
  const [mouseIsPressed, setMouseIsPressed] = useState(false);
  const [hasProcessedSteps, setHasProcessedSteps] = useState(false);
  const [hasDisplayedAlgorithm, setHasDisplayedAlgorithm] = useState(false);
  const [previousPressedCell, setPreviousPressedCell] = useState(null);
  const [pendingAnimations, setPendingAnimation] = useState([]);
  const [startCoords, setStartCoords] = useState({
    row: START_END_COORDS.START_NODE_ROW,
    col: START_END_COORDS.START_NODE_COL
  });
  const [endCoords, setEndCoords] = useState({
    row: START_END_COORDS.END_NODE_ROW,
    col: START_END_COORDS.END_NODE_COL
  });

  const toggleReverseState = state => {
    const newState = state.substring(NODE_STATE.DEFAULT.length+1);
    if ([NODE_STATE.VISITED, NODE_STATE.SHORTEST_PATH, NODE_STATE.WALL].includes(newState)) {
      return `${state}-reverse`;
    } else if ([NODE_STATE.VISITED_REVERSE, NODE_STATE.SHORTEST_PATH_REVERSE,
        NODE_STATE.WALL_REVERSE].includes(newState)) {
      return state.substring(0, state.length-"-reverse".length);
    }
    return state;
  }

  const initNode = useCallback((row, col) => {
    let state = "";
    if (row===startCoords.row && col===startCoords.col) {
      state = NODE_STATE.START;
    } else if (row===endCoords.row && col===endCoords.col) {
      state = NODE_STATE.END;
    }

    return {
      row, col, state,
    };
  }, [startCoords, endCoords]);

  const initGrid = useCallback(() => {
      let grid = new Array(GRID_SIZE.ROW_SIZE);
      for (let r = 0; r<grid.length; ++r) {
        let row = new Array(GRID_SIZE.COL_SIZE);
        for (let c = 0; c<row.length; ++c) {
          row[c] = initNode(r, c);
        }
        grid[r] = row;
      }
      return grid;
  }, [initNode]);
  
  // Create a new grid with grid[row][col] modified to value
  const setNewGridCell = (row, col, value) => {
    let newGrid = new Array(grid.length);
    for (let r = 0; r<grid.length; ++r) {
      newGrid[r] = [...grid[r]];
    }
    newGrid[row][col] = value;
    return newGrid;
  }

  // Create a new grid with grid[row][col] toggled between a wall or none
  const toggleNewGridWall = (row, col) => {
    let toggledWall = grid[row][col].state===NODE_STATE.WALL 
      ? NODE_STATE.WALL : NODE_STATE.WALL_REVERSE;
    let value = {
      ...grid[row][col],
      state: toggleReverseState(`${NODE_STATE.DEFAULT} ${toggledWall}`)
        .substring(NODE_STATE.DEFAULT.length+1),
    };
    setGrid(setNewGridCell(row, col, value));
  }

  const clearGrid = useCallback(() => {
    for (let r = 0; r<grid.length; ++r) {
      for (let c = 0; c<grid[r].length; ++c) {
        const {row, col, state}= initNode(r, c);
        document.getElementById(`node-${row}-${col}`)
          .className = `${NODE_STATE.DEFAULT} ${state}`;
      }
    }
  }, [grid, initNode]);

  // Takes a list of states to clear from the grid
  const clearState = useCallback(statesToClear => {
    let hasToggled = false;

    for (let r = 0; r<grid.length; ++r) {
      for (let c = 0; c < grid[r].length; ++c) {
        const {row, col}= initNode(r, c);
        const node = document.getElementById(`node-${row}-${col}`);
        
        for (let stateToClear of statesToClear) {
          if (`${NODE_STATE.DEFAULT} ${stateToClear}`===node.className) {
            node.className = toggleReverseState(node.className);
            hasToggled = true;
          }
        }
      }
    }

    return hasToggled;
  }, [grid, initNode]);

  // Start toggling cells between wall and none
  const handleMouseDown = (row, col) => {
    if (isRunning || hasDisplayedAlgorithm
        || grid[row][col].state!==NODE_STATE.WALL
        && grid[row][col].state!==NODE_STATE.WALL_REVERSE
        && grid[row][col].state!=="") return;
    setMouseIsPressed(true);
    setPreviousPressedCell(grid[row][col]);
    toggleNewGridWall(row, col);
  }

  // Stop toggling cells between wall and none
  const handleMouseUp = () => {
    setMouseIsPressed(false);
  }

  // Toggle the entered cell between a wall or none
  const handleMouseEnter = (row, col) => {
    if (!mouseIsPressed || isRunning 
        // There's a bug that registers 2 enters in a square when you enter 
        // only once. So this prevents that.
        || previousPressedCell.row===row && previousPressedCell.col===col
        || grid[row][col].state!==NODE_STATE.WALL
        && grid[row][col].state!==NODE_STATE.WALL_REVERSE
        && grid[row][col].state!=="") return;
    setPreviousPressedCell(grid[row][col]);
    toggleNewGridWall(row, col);
  }

  useEffect(() => {
    setGrid(initGrid());
  }, [initGrid]);

  // Animate the algorithm
  // ! grid, startCoords, algorithm, and animationSpeed cannot be changed while running
  useEffect(() => { (async function() {
    // Clear the animation if animating but the user aborted
    if (!isRunning && hasProcessedSteps) {
      clearState([NODE_STATE.VISITED, NODE_STATE.SHORTEST_PATH]);
      for (let i = 0; i<pendingAnimations.length; ++i) {
        clearTimeout(pendingAnimations[i]);
      }
      
      setHasDisplayedAlgorithm(false);
      setHasProcessedSteps(false);
      return;
    }
    // Make the algorithm run only once at a time
    else if (!isRunning || hasProcessedSteps) return;

    // Clear the grid and stop any previous animation
    const hasDisplayedAlgo = clearState([NODE_STATE.VISITED, NODE_STATE.SHORTEST_PATH]);

    // Sleep for the animation time (1.5s)
    // Only sleep when there are toggled nodes
    if (hasDisplayedAlgo) {
      await new Promise(r => setTimeout(r, 1500));
    }

    for (let i = 0; i<pendingAnimations.length; ++i) {
      clearTimeout(pendingAnimations[i]);
    }

    const {steps, shortestPath} = algorithm.run(grid, grid[startCoords.row][startCoords.col]);
    const animations = [];

    // Animate the steps to the algorithm
    for (let i = 0; i<steps.length; ++i) {
      animations.push(setTimeout(() => {
        const {row, col} = steps[i];
        document.getElementById(`node-${row}-${col}`)
          .className = `${NODE_STATE.DEFAULT} ${NODE_STATE.VISITED}`;
      }, ANIMATION_SPEED.STEPS*i*animationSpeed));
    }

    // Animate the shortest path to end
    for (let i = 0; i<shortestPath.length; ++i) {
      animations.push(setTimeout(() => {
        const {row, col} = shortestPath[i];
        document.getElementById(`node-${row}-${col}`)
          .className = `${NODE_STATE.DEFAULT} ${NODE_STATE.SHORTEST_PATH}`;
      }, (ANIMATION_SPEED.SHORTEST_PATH*i+ANIMATION_SPEED.STEPS*steps.length)*animationSpeed));
    }

    animations.push(setTimeout(() => {
      setIsRunning(false);
      setHasProcessedSteps(false);
    }, (ANIMATION_SPEED.STEPS*steps.length+ANIMATION_SPEED.SHORTEST_PATH*shortestPath.length)*animationSpeed));

    setPendingAnimation(animations);
    setHasDisplayedAlgorithm(true);
    setHasProcessedSteps(true);
  })(); }, [
    isRunning, setIsRunning, grid, startCoords, algorithm, 
    animationSpeed, clearState, pendingAnimations, hasProcessedSteps,
    hasDisplayedAlgorithm
  ]);

  // hasProcessedSteps must be the same as isRunning
  useEffect(() => setHasProcessedSteps(isRunning), [isRunning]);

  return (
    <div className="grid-container">
      <div className="grid-table-container" onMouseUp={handleMouseUp}>
        <table cellSpacing="0">
          <tbody className="grid">
            {grid.map((row, rowIdx) => {

              return (<tr key={rowIdx}>
                {row.map((node, nodeIdx) => {

                  const {row, col, state} = node;
                  return (<Node 
                    key={nodeIdx}
                    row={row}
                    col={col}
                    state={state}
                    onMouseDown={(row, col) => handleMouseDown(row, col)}
                    onMouseUp={handleMouseUp}
                    onMouseEnter={(row, col) => handleMouseEnter(row, col)}
                  />);

                })}
              </tr>)

            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Grid;
