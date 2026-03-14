import {
  createInitialState,
  placeFood,
  queueDirection,
  stepGame,
} from "./snake-game.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runTests() {
  const initial = createInitialState(8);
  assert(initial.snake.length === 3, "initial snake should have three segments");
  assert(initial.food !== null, "initial state should place food");

  const moved = stepGame({
    ...initial,
    food: { x: 0, y: 0 },
    status: "running",
  });
  assert(moved.snake[0].x === initial.snake[0].x + 1, "snake should move right by default");
  assert(moved.snake.length === 3, "snake should keep the same length without food");

  const grew = stepGame(
    {
      ...initial,
      food: { x: initial.snake[0].x + 1, y: initial.snake[0].y },
      status: "running",
    },
    0,
  );
  assert(grew.score === 1, "eating food should increase score");
  assert(grew.snake.length === 4, "eating food should grow the snake");

  const boundaryCrash = stepGame({
    gridSize: 4,
    snake: [{ x: 3, y: 0 }],
    direction: "right",
    queuedDirection: "right",
    food: { x: 0, y: 0 },
    score: 0,
    status: "running",
  });
  assert(boundaryCrash.status === "game-over", "crossing the boundary should end the game");

  const selfCrash = stepGame({
    gridSize: 6,
    snake: [
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    direction: "up",
    queuedDirection: "left",
    food: { x: 5, y: 5 },
    score: 0,
    status: "running",
  });
  assert(selfCrash.status === "game-over", "running into the body should end the game");

  const reversed = queueDirection(
    {
      ...initial,
      direction: "right",
      queuedDirection: "right",
    },
    "left",
  );
  assert(reversed.queuedDirection === "right", "snake should ignore immediate reverse direction");

  const deterministicFood = placeFood(
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
    3,
    0,
  );
  assert(deterministicFood.x === 2 && deterministicFood.y === 0, "food should pick the first free cell");

  console.log("All snake logic tests passed.");
}

runTests();
