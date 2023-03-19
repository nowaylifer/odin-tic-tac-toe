/* eslint-disable prefer-destructuring */
/* eslint-disable default-case */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-use-before-define */
/* eslint-disable no-param-reassign */
/* eslint-disable no-useless-return */
/* eslint-disable no-restricted-syntax */

class Cell {
  static #cellCount = 0;

  owner;

  constructor() {
    this.id = Cell.#cellCount;
    Cell.#cellCount += 1;
  }

  attachClickHandler(cellDiv) {
    cellDiv.addEventListener('click', () => Controller.playRound(this));
    this.element = cellDiv;
  }

  updateOwner(player) {
    this.owner = player;
    this.element.insertAdjacentHTML(
      'afterbegin',
      player.mark === 'X'
        ? `<i class="fas fa-times" aria-hidden="true"></i>`
        : `<i class="fas fa-circle-notch" aria-hidden="true"></i>`
    );
  }
}

class Player {
  score = 0;

  constructor(mark) {
    this.mark = mark;
    this.scoreEl =
      this.mark === 'X'
        ? document.querySelector('.score.player-X')
        : document.querySelector('.score.player-O');
  }

  updateScore() {
    this.score += 1;
    this.scoreEl.textContent = this.score;
  }
}

class Bot extends Player {
  constructor(mark, level) {
    super(mark);
    this.level = level;
  }

  #makeMove() {
    const availableCells = GameBoard.cellList.filter(cell => !cell.owner);
    const targetCell =
      availableCells[Math.floor(Math.random() * availableCells.length)];
    Controller.playRound(targetCell);
  }

  makeMove = function () {
    DOM.toggleLockBoard(true);
    setTimeout(() => {
      this.#makeMove.call(this);
      DOM.toggleLockBoard(false);
    }, 300);
  };
}

const GameBoard = (() => {
  const cellList = [];
  for (let i = 0; i < 9; i += 1) {
    cellList.push(new Cell());
  }

  const winCombos = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const isDraw = () => cellList.every(cell => cell.owner);

  const checkWinCombo = pickedCell => {
    // find combos where pickedCell is in
    const allegedCombos = winCombos.filter(combo =>
      combo.includes(pickedCell.id)
    );

    const winCombo = allegedCombos.find(combo =>
      combo.every(cellId => cellList[cellId].owner === pickedCell.owner)
    );

    return winCombo !== -1 ? winCombo : false;
  };

  return {
    isDraw,
    checkWinCombo,
    get cellList() {
      return cellList;
    },
  };
})();

const Controller = (() => {
  const players = [new Player('X'), new Bot('O', 'easy')];
  let activePlayer = players[0];
  let isGameOver = false;

  const createNewPlayer = (type, mark) => {
    const player =
      type === 'human' ? new Player(`${mark}`) : new Bot(`${mark}`, 'easy');

    if (mark === 'X') {
      players[0] = player;
    } else {
      players[1] = player;
    }

    if (players.every(p => p !== activePlayer)) {
      activePlayer = player;
    }

    if (activePlayer instanceof Bot) {
      activePlayer.makeMove();
    }
  };

  const startNewGame = () => {
    isGameOver = false;
    activePlayer = players[0];

    if (activePlayer instanceof Bot) {
      activePlayer.makeMove();
    }
  };

  const switchAcivePlayer = () => {
    activePlayer = activePlayer === players[0] ? players[1] : players[0];
  };

  const gameOver = (isDraw, winCombo) => {
    isGameOver = true;
    if (isDraw) {
      DOM.declareGameResult();
    } else {
      activePlayer.updateScore();
      DOM.declareGameResult(activePlayer, winCombo);
    }
  };

  const playRound = currCell => {
    if (currCell.owner || isGameOver) {
      return;
    }

    currCell.updateOwner(activePlayer);
    const winCombo = GameBoard.checkWinCombo(currCell);

    if (winCombo) {
      gameOver(false, winCombo);
      return;
    }

    if (GameBoard.isDraw()) {
      gameOver(true, null);
      return;
    }

    switchAcivePlayer();

    if (activePlayer instanceof Bot) {
      activePlayer.makeMove();
    }
  };

  return {
    startNewGame,
    createNewPlayer,
    playRound,
    players,
  };
})();

const DOM = (() => ({
  elements: {
    boardEl: document.querySelector('.board-grid'),
    resultMsgEl: document.querySelector('.game-result-msg'),
    newGameBtnEl: document.getElementById('new-game-btn'),
    resetBtnEl: document.getElementById('reset-btn'),
  },

  init() {
    GameBoard.cellList.forEach((cell, index) => {
      cell.attachClickHandler(this.elements.boardEl.children[index]);
    });

    this.playerXMenu = new Menu('X');
    this.playerOMenu = new Menu('O');

    // newGameBtn click handler
    this.elements.newGameBtnEl.addEventListener('click', () => {
      this.elements.resultMsgEl.textContent = '';
      for (const cell of GameBoard.cellList) {
        cell.owner = null;
        cell.element.innerHTML = '';
        cell.element.style.backgroundColor = 'white';
      }
      Controller.startNewGame();
    });
  },

  toggleLockBoard(shouldLock) {
    for (const cell of GameBoard.cellList) {
      cell.element.style.pointerEvents = shouldLock ? 'none' : '';
    }
  },

  declareGameResult(player, winCombo) {
    if (!player) {
      this.elements.resultMsgEl.textContent = "It's a draw!";
      return;
    }
    this.elements.resultMsgEl.textContent = `${player.mark} win!`;

    // highlight win combo cells
    for (const cellId of winCombo) {
      GameBoard.cellList[cellId].element.style.backgroundColor = '#fdf0f2';
    }
  },
}))();

class Menu {
  #btnNonePressedColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue('--button');

  #pressedColor;

  #alreadyPressedBtn;

  constructor(mark) {
    this.mark = mark;
    this.#pressedColor = getComputedStyle(
      document.documentElement
    ).getPropertyValue(`--button-player${this.mark}`);

    this.init();
  }

  #btnClickHandler(btn) {
    if (this.#alreadyPressedBtn === btn) {
      return;
    }

    const playerType = btn.textContent.toLowerCase();
    Controller.createNewPlayer(playerType, this.mark);
    btn.style.backgroundColor = this.#pressedColor;

    this.#alreadyPressedBtn.style.backgroundColor = this.#btnNonePressedColor;
    this.#alreadyPressedBtn = btn;
  }

  init() {
    const menuSection = document.querySelector(
      `.menu-section--player-${this.mark}`
    );
    const selectionBtns = menuSection.querySelectorAll('button');

    for (const btn of selectionBtns) {
      btn.addEventListener(
        'click',
        this.#btnClickHandler.bind(this, btn, false)
      );
    }

    // choose initial players type after page loading
    const currentMenuPlayer = Controller.players.find(
      player => player.mark === this.mark
    );

    this.#alreadyPressedBtn =
      currentMenuPlayer instanceof Bot ? selectionBtns[1] : selectionBtns[0];
    this.#alreadyPressedBtn.style.backgroundColor = this.#pressedColor;
  }
}

DOM.init();
