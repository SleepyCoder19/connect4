/* ═══════════════════════════════════════════
   Connect 4  —  Full Game Logic + Saphire AI
   ═══════════════════════════════════════════ */

const ROWS = 6;
const COLS = 7;

const SAPHIRE_NAME  = 'Saphire';
const SAPHIRE_COLOR = '#0F52BA';
const AI_DEPTH      = 5;   // minimax search depth

// ── State ──────────────────────────────────
const state = {
  players: [
    { id: 1, name: 'Player 1', color: null },
    { id: 2, name: 'Player 2', color: null },
  ],
  board: [],
  currentPlayer: 1,
  gameOver: false,
  dropping: false,
  vsComputer: false,
  computerThinking: false,
  lastSavedNames:  ['', ''],
  lastSavedColors: [null, null],
  lastSavedMode:   '2p',
};

// ── DOM refs ───────────────────────────────
const setupScreen    = document.getElementById('setup-screen');
const gameScreen     = document.getElementById('game-screen');
const nameInputs     = [document.getElementById('name-1'), document.getElementById('name-2')];
const swatchGroups   = [document.getElementById('swatches-1'), document.getElementById('swatches-2')];
const warnings       = [document.getElementById('warn-1'), document.getElementById('warn-2')];
const startBtn       = document.getElementById('start-btn');
const boardEl        = document.getElementById('board');
const ghostRow       = document.getElementById('ghost-row');
const turnDot        = document.getElementById('turn-dot');
const turnText       = document.getElementById('turn-text');
const resultOverlay  = document.getElementById('result-overlay');
const resultText     = document.getElementById('result-text');
const playAgainBtn   = document.getElementById('play-again-btn');
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx            = confettiCanvas.getContext('2d');
const winLineCanvas  = document.getElementById('win-line-canvas');
const winLineCtx     = winLineCanvas.getContext('2d');
const turnBanner     = document.getElementById('turn-banner');
const turnBannerDot  = document.getElementById('turn-banner-dot');
const turnBannerText = document.getElementById('turn-banner-text');
const thinkingEl     = document.getElementById('thinking-indicator');
const p2Human        = document.getElementById('p2-human');
const p2Saphire      = document.getElementById('p2-saphire');
const card2          = document.getElementById('card-2');
const modeBtns       = document.querySelectorAll('.mode-btn');

// ── Mode Toggle ────────────────────────────

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.vsComputer = btn.dataset.mode === 'ai';
    applyMode();
    validateStart();
  });
});

function applyMode() {
  if (state.vsComputer) {
    p2Human.style.display    = 'none';
    p2Saphire.classList.remove('hidden');
    card2.classList.add('ai-locked');
    state.players[1].name  = SAPHIRE_NAME;
    state.players[1].color = SAPHIRE_COLOR;
    // mark card-2 as always ready
    card2.classList.add('ready');
  } else {
    p2Human.style.display    = '';
    p2Saphire.classList.add('hidden');
    card2.classList.remove('ai-locked', 'ready');
    // restore last human p2 values
    state.players[1].name  = nameInputs[1].value.trim() || 'Player 2';
    state.players[1].color = null;
    // re-apply saved color selection
    swatchGroups[1].querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
    if (state.lastSavedColors[1] && !state.vsComputer) {
      const match = swatchGroups[1].querySelector(`.swatch[data-color="${state.lastSavedColors[1]}"]`);
      if (match) { match.classList.add('selected'); state.players[1].color = state.lastSavedColors[1]; }
    }
    updateTakenSwatches();
    updateCardReady();
  }
}

// ── Setup Screen Logic ─────────────────────

function initSetup() {
  // Restore last mode
  state.vsComputer = state.lastSavedMode === 'ai';
  modeBtns.forEach(b => {
    b.classList.toggle('active', b.dataset.mode === state.lastSavedMode);
  });

  nameInputs.forEach((input, i) => { input.value = state.lastSavedNames[i]; });

  // Reset p2 swatch selection
  swatchGroups.forEach((group, i) => {
    group.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected', 'taken'));
    state.players[i].color = null;
    if (state.lastSavedColors[i]) {
      const match = group.querySelector(`.swatch[data-color="${state.lastSavedColors[i]}"]`);
      if (match) { match.classList.add('selected'); state.players[i].color = state.lastSavedColors[i]; }
    }
  });

  warnings.forEach(w => w.textContent = '');
  applyMode();
  validateStart();
}

swatchGroups.forEach((group, playerIdx) => {
  group.addEventListener('click', (e) => {
    const swatch = e.target.closest('.swatch');
    if (!swatch || swatch.classList.contains('taken')) return;

    const color    = swatch.dataset.color;
    const otherIdx = playerIdx === 0 ? 1 : 0;

    if (color === state.players[otherIdx].color) {
      warnings[playerIdx].textContent = 'Color already taken!';
      setTimeout(() => { warnings[playerIdx].textContent = ''; }, 1800);
      return;
    }

    group.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
    swatch.classList.add('selected');
    state.players[playerIdx].color = color;
    warnings[playerIdx].textContent = '';

    updateTakenSwatches();
    updateCardReady();
    validateStart();
  });
});

nameInputs.forEach((input, i) => {
  input.addEventListener('input', () => { updateCardReady(); validateStart(); });
});

function updateTakenSwatches() {
  swatchGroups.forEach((group, i) => {
    const otherIdx  = i === 0 ? 1 : 0;
    const takenColor = state.players[otherIdx].color;
    group.querySelectorAll('.swatch').forEach(s => {
      s.classList.toggle('taken', !!(takenColor && s.dataset.color === takenColor));
    });
  });
}

function updateCardReady() {
  [0, 1].forEach(i => {
    const card    = document.getElementById(`card-${i + 1}`);
    const hasName = nameInputs[i].value.trim().length > 0;
    const hasColor = !!state.players[i].color;
    // card-2 in AI mode is always ready (handled in applyMode)
    if (i === 1 && state.vsComputer) return;
    card.classList.toggle('ready', hasName && hasColor);
  });
}

function validateStart() {
  const p1Ready = nameInputs[0].value.trim().length > 0 && !!state.players[0].color;
  const p2Ready = state.vsComputer
    ? true
    : nameInputs[1].value.trim().length > 0 && !!state.players[1].color;
  startBtn.disabled = !(p1Ready && p2Ready);
}

startBtn.addEventListener('click', () => {
  state.players[0].name  = nameInputs[0].value.trim() || 'Player 1';
  state.players[0].color = state.players[0].color;
  if (!state.vsComputer) {
    state.players[1].name  = nameInputs[1].value.trim() || 'Player 2';
  }
  state.lastSavedNames  = [state.players[0].name, state.vsComputer ? SAPHIRE_NAME : state.players[1].name];
  state.lastSavedColors = [state.players[0].color, state.vsComputer ? SAPHIRE_COLOR : state.players[1].color];
  state.lastSavedMode   = state.vsComputer ? 'ai' : '2p';
  startGame();
});

// ── Game Logic ─────────────────────────────

function startGame() {
  state.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  state.currentPlayer   = 1;
  state.gameOver        = false;
  state.dropping        = false;
  state.computerThinking = false;

  thinkingEl.classList.add('hidden');
  turnBanner.classList.add('hidden');
  turnBanner.classList.remove('show');

  const indicator = document.querySelector('.turn-indicator');
  indicator.style.borderColor = '';
  indicator.style.boxShadow   = '';

  buildBoard();
  updateTurnIndicator();

  resultOverlay.classList.add('hidden');
  setupScreen.classList.remove('active');
  gameScreen.classList.add('active');
}

function buildBoard() {
  boardEl.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = r;
      cell.dataset.col = c;
      boardEl.appendChild(cell);
    }
  }
  boardEl.addEventListener('click', onBoardClick);

  ghostRow.querySelectorAll('.ghost-cell').forEach(gc => {
    gc.addEventListener('mouseenter', onGhostEnter);
    gc.addEventListener('mouseleave', onGhostLeave);
    gc.addEventListener('click', onGhostClick);
  });
}

function onBoardClick(e) {
  const cell = e.target.closest('.cell');
  if (!cell) return;
  dropPiece(parseInt(cell.dataset.col));
}

function onGhostClick(e) {
  dropPiece(parseInt(e.currentTarget.dataset.col));
}

function onGhostEnter(e) {
  if (state.gameOver || state.dropping) return;
  // Don't show ghost during computer's turn
  if (state.vsComputer && state.currentPlayer === 2) return;
  const col = parseInt(e.currentTarget.dataset.col);
  if (getLowestEmptyRow(col) === -1) return;
  clearGhosts();
  const ghost = document.createElement('div');
  ghost.classList.add('ghost-piece');
  ghost.style.background = currentColor();
  e.currentTarget.appendChild(ghost);
}

function onGhostLeave() { clearGhosts(); }
function clearGhosts()  { ghostRow.querySelectorAll('.ghost-piece').forEach(g => g.remove()); }

function dropPiece(col, isComputer = false) {
  if (state.gameOver || state.dropping) return;
  // Human can't click during computer's turn
  if (!isComputer && state.vsComputer && state.currentPlayer === 2) return;

  const row = getLowestEmptyRow(col);
  if (row === -1) return;

  state.dropping = true;
  state.board[row][col] = state.currentPlayer;
  renderPiece(row, col);
  clearGhosts();

  setTimeout(() => {
    const winCells = checkWin(row, col);
    if (winCells) {
      state.dropping = false;
      highlightWinners(winCells);
      endGame('win');
    } else if (isDraw()) {
      state.dropping = false;
      endGame('draw');
    } else {
      state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
      updateTurnIndicator();
      showTurnBanner();
      setTimeout(() => {
        state.dropping = false;
        if (state.vsComputer && state.currentPlayer === 2) {
          triggerComputerMove();
        }
      }, 950);
    }
  }, 460);
}

function renderPiece(row, col) {
  const cell  = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  const piece = document.createElement('div');
  piece.classList.add('piece');
  piece.style.background = playerColor(state.currentPlayer);
  cell.appendChild(piece);
  requestAnimationFrame(() => requestAnimationFrame(() => piece.classList.add('landed')));
}

function getLowestEmptyRow(col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (state.board[r][col] === null) return r;
  }
  return -1;
}

function playerColor(id)  { return state.players[id - 1].color; }
function currentColor()   { return playerColor(state.currentPlayer); }

// ── Win Detection ──────────────────────────

function checkWin(row, col, board = state.board) {
  const pid = board[row][col];
  const dirs = [[[0,1],[0,-1]], [[1,0],[-1,0]], [[1,1],[-1,-1]], [[1,-1],[-1,1]]];
  for (const [a, b] of dirs) {
    const cells = [[row, col], ...getCells(row, col, a, pid, board), ...getCells(row, col, b, pid, board)];
    if (cells.length >= 4) return cells;
  }
  return null;
}

function getCells(row, col, [dr, dc], pid, board = state.board) {
  const cells = [];
  let r = row + dr, c = col + dc;
  while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === pid) {
    cells.push([r, c]);
    r += dr; c += dc;
  }
  return cells;
}

function isDraw(board = state.board) {
  return board[0].every(cell => cell !== null);
}

function highlightWinners(cells) {
  boardEl.classList.add('has-winner');
  cells.forEach(([r, c]) => {
    boardEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`).classList.add('winner-cell');
  });
  drawWinLine(cells);
}

function drawWinLine(cells) {
  const boardRect   = boardEl.getBoundingClientRect();
  const wrapperRect = boardEl.parentElement.getBoundingClientRect();
  winLineCanvas.width  = wrapperRect.width;
  winLineCanvas.height = wrapperRect.height;

  const centres = cells.map(([r, c]) => {
    const el   = boardEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left - wrapperRect.left + rect.width  / 2,
      y: rect.top  - wrapperRect.top  + rect.height / 2,
    };
  });
  centres.sort((a, b) => a.x - b.x || a.y - b.y);

  const start    = centres[0];
  const end      = centres[centres.length - 1];
  const color    = playerColor(state.currentPlayer);
  const duration = 320;
  const t0       = performance.now();

  (function animateLine(now) {
    const ease = 1 - Math.pow(1 - Math.min((now - t0) / duration, 1), 3);
    const cx = start.x + (end.x - start.x) * ease;
    const cy = start.y + (end.y - start.y) * ease;
    winLineCtx.clearRect(0, 0, winLineCanvas.width, winLineCanvas.height);
    winLineCtx.beginPath(); winLineCtx.moveTo(start.x, start.y); winLineCtx.lineTo(cx, cy);
    winLineCtx.strokeStyle = 'rgba(255,255,255,0.9)'; winLineCtx.lineWidth = 10; winLineCtx.lineCap = 'round'; winLineCtx.stroke();
    winLineCtx.beginPath(); winLineCtx.moveTo(start.x, start.y); winLineCtx.lineTo(cx, cy);
    winLineCtx.strokeStyle = color; winLineCtx.lineWidth = 5; winLineCtx.stroke();
    if (ease < 1) requestAnimationFrame(animateLine);
  })(t0);
}

function clearWinLine() {
  winLineCtx.clearRect(0, 0, winLineCanvas.width, winLineCanvas.height);
  boardEl.classList.remove('has-winner');
}

// ── Turn Indicator ─────────────────────────

let bannerTimeout = null;

function updateTurnIndicator() {
  const p = state.players[state.currentPlayer - 1];
  turnDot.style.background = p.color;
  turnDot.style.boxShadow  = `0 0 10px ${p.color}`;
  turnText.textContent     = `${p.name}'s turn`;

  const indicator = document.querySelector('.turn-indicator');
  indicator.style.borderColor = p.color;
  indicator.style.boxShadow   = `0 0 16px ${p.color}55`;
  indicator.classList.remove('pop');
  void indicator.offsetWidth;
  indicator.classList.add('pop');
}

function showTurnBanner() {
  const p = state.players[state.currentPlayer - 1];
  turnBannerDot.style.background = p.color;
  turnBannerDot.style.boxShadow  = `0 0 12px ${p.color}`;
  turnBannerText.textContent     = `${p.name}'s turn`;
  turnBannerText.style.color     = p.color;

  if (bannerTimeout) clearTimeout(bannerTimeout);
  turnBanner.classList.remove('hidden', 'show');
  void turnBanner.offsetWidth;
  turnBanner.classList.add('show');
  bannerTimeout = setTimeout(() => {
    turnBanner.classList.add('hidden');
    turnBanner.classList.remove('show');
  }, 900);
}

// ── End Game ───────────────────────────────

function endGame(type) {
  state.gameOver = true;
  thinkingEl.classList.add('hidden');
  boardEl.removeEventListener('click', onBoardClick);

  if (type === 'win') {
    const winner = state.players[state.currentPlayer - 1];
    resultText.innerHTML = `<span style="color:${winner.color}">${escapeHtml(winner.name)} Wins!</span>`;
    showConfetti(winner.color);
  } else {
    resultText.innerHTML = `<span style="color:#94a3b8">It's a Draw!</span>`;
  }
  setTimeout(() => resultOverlay.classList.remove('hidden'), 600);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

playAgainBtn.addEventListener('click', () => {
  stopConfetti();
  clearWinLine();
  resultOverlay.classList.add('hidden');
  gameScreen.classList.remove('active');
  boardEl.removeEventListener('click', onBoardClick);
  boardEl.innerHTML = '';
  initSetup();
  setupScreen.classList.add('active');
});

// ══════════════════════════════════════════
//  SAPHIRE AI  —  Minimax with Alpha-Beta
// ══════════════════════════════════════════

function triggerComputerMove() {
  if (state.gameOver) return;
  state.computerThinking = true;
  thinkingEl.classList.remove('hidden');

  // Small delay so the UI updates before the compute-heavy minimax runs
  setTimeout(() => {
    const col = getBestMove();
    thinkingEl.classList.add('hidden');
    state.computerThinking = false;
    dropPiece(col, true);
  }, 400);
}

function getBestMove() {
  const aiId    = 2;   // Saphire is always player 2
  const humanId = 1;
  let bestScore = -Infinity;
  let bestCol   = null;

  // Prefer center columns (tried in order of distance from center)
  const colOrder = [3, 2, 4, 1, 5, 0, 6];

  for (const col of colOrder) {
    const row = getLowestEmptyRowB(state.board, col);
    if (row === -1) continue;

    state.board[row][col] = aiId;

    // Immediate win — take it now
    if (checkWin(row, col, state.board)) {
      state.board[row][col] = null;
      return col;
    }

    const score = minimax(state.board, AI_DEPTH - 1, -Infinity, Infinity, false, aiId, humanId);
    state.board[row][col] = null;

    if (score > bestScore) {
      bestScore = score;
      bestCol   = col;
    }
  }
  return bestCol;
}

function minimax(board, depth, alpha, beta, isMaximizing, aiId, humanId) {
  // Check draw
  if (isDraw(board)) return 0;
  if (depth === 0) return evaluateBoard(board, aiId, humanId);

  const cols = getValidCols(board);

  if (isMaximizing) {
    let best = -Infinity;
    for (const col of cols) {
      const row = getLowestEmptyRowB(board, col);
      board[row][col] = aiId;
      if (checkWin(row, col, board)) {
        board[row][col] = null;
        return 100000 + depth;   // win sooner = better
      }
      const score = minimax(board, depth - 1, alpha, beta, false, aiId, humanId);
      board[row][col] = null;
      best  = Math.max(best, score);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const col of cols) {
      const row = getLowestEmptyRowB(board, col);
      board[row][col] = humanId;
      if (checkWin(row, col, board)) {
        board[row][col] = null;
        return -100000 - depth;  // human wins sooner = worse
      }
      const score = minimax(board, depth - 1, alpha, beta, true, aiId, humanId);
      board[row][col] = null;
      best = Math.min(best, score);
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function evaluateBoard(board, aiId, humanId) {
  let score = 0;

  // Prefer center column
  const center = Math.floor(COLS / 2);
  for (let r = 0; r < ROWS; r++) {
    if (board[r][center] === aiId) score += 3;
  }

  // Score every window of 4
  // Horizontal
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]], aiId, humanId);

  // Vertical
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r <= ROWS - 4; r++)
      score += scoreWindow([board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]], aiId, humanId);

  // Diagonal ↘
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]], aiId, humanId);

  // Diagonal ↙
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]], aiId, humanId);

  return score;
}

function scoreWindow(window, aiId, humanId) {
  const ai    = window.filter(c => c === aiId).length;
  const human = window.filter(c => c === humanId).length;
  const empty = window.filter(c => c === null).length;

  if (ai === 4)                    return 100;
  if (ai === 3 && empty === 1)     return 5;
  if (ai === 2 && empty === 2)     return 2;
  if (human === 3 && empty === 1)  return -4;   // block human threat
  return 0;
}

function getValidCols(board) {
  const cols = [3, 2, 4, 1, 5, 0, 6];   // center-first order
  return cols.filter(c => board[0][c] === null);
}

function getLowestEmptyRowB(board, col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === null) return r;
  }
  return -1;
}

// ── Confetti ───────────────────────────────

let confettiParticles = [];
let confettiAnimId    = null;
let confettiRunning   = false;

function showConfetti(winnerColor) {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;

  const colors = [winnerColor, state.players[0].color, state.players[1].color, '#ffffff', '#ffd700', '#ff69b4'];
  confettiParticles = Array.from({ length: 160 }, () => ({
    x: Math.random() * confettiCanvas.width,
    y: Math.random() * -confettiCanvas.height * 0.5,
    w: 8 + Math.random() * 10,
    h: 5 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    speed: 2.5 + Math.random() * 4,
    angle: Math.random() * Math.PI * 2,
    spin:  (Math.random() - 0.5) * 0.18,
    drift: (Math.random() - 0.5) * 1.5,
    shape: Math.random() < 0.5 ? 'rect' : 'circle',
  }));

  confettiRunning = true;
  const t0       = performance.now();
  const duration = 4500;

  (function draw(now) {
    if (!confettiRunning) return;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    const elapsed = now - t0;
    const fade    = Math.max(0, 1 - (elapsed - (duration - 800)) / 800);

    confettiParticles.forEach(p => {
      p.y += p.speed; p.x += p.drift; p.angle += p.spin;
      ctx.save();
      ctx.globalAlpha = elapsed < duration - 800 ? 1 : fade;
      ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') { ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h); }
      else { ctx.beginPath(); ctx.arc(0, 0, p.w/2, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
      if (p.y > confettiCanvas.height + 20) { p.y = -20; p.x = Math.random() * confettiCanvas.width; }
    });

    if (elapsed < duration) { confettiAnimId = requestAnimationFrame(draw); }
    else { stopConfetti(); }
  })(t0);
}

function stopConfetti() {
  confettiRunning = false;
  if (confettiAnimId) { cancelAnimationFrame(confettiAnimId); confettiAnimId = null; }
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

// ── Boot ───────────────────────────────────
initSetup();
