import React, { useState, useEffect, useRef } from 'react';
import './Minesweeper.css';

const Minesweeper = () => {
    const ROWS = 9;
    const COLS = 9;
    const MINES = 10;

    const [grid, setGrid] = useState([]);
    const [gameState, setGameState] = useState('waiting'); // waiting, playing, won, lost
    const [mineCount, setMineCount] = useState(MINES);
    const [timer, setTimer] = useState(0);
    const [smiley, setSmiley] = useState('😊');

    // Timer Effect
    useEffect(() => {
        let interval = null;
        if (gameState === 'playing') {
            interval = setInterval(() => {
                setTimer(t => Math.min(t + 1, 999));
            }, 1000);
        } else if (gameState !== 'playing') {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [gameState]);

    // Initialize Game
    const initGame = () => {
        setTimer(0);
        setGrid(createEmptyGrid());
        setGameState('waiting');
        setMineCount(MINES);
        setSmiley('😊');
    };

    useEffect(() => {
        initGame();
    }, []);

    const createEmptyGrid = () => {
        const newGrid = [];
        for (let r = 0; r < ROWS; r++) {
            const row = [];
            for (let c = 0; c < COLS; c++) {
                row.push({
                    r, c,
                    isMine: false,
                    isOpen: false,
                    isFlagged: false,
                    neighborCount: 0
                });
            }
            newGrid.push(row);
        }
        return newGrid;
    };

    const placeMines = (firstR, firstC) => {
        const newGrid = createEmptyGrid();
        let minesPlaced = 0;

        while (minesPlaced < MINES) {
            const r = Math.floor(Math.random() * ROWS);
            const c = Math.floor(Math.random() * COLS);

            // Ensure not placing on existing mine, and safe zone around first click
            if (!newGrid[r][c].isMine && !(r === firstR && c === firstC)) {
                newGrid[r][c].isMine = true;
                minesPlaced++;
            }
        }

        // Calculate Neighbors
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (!newGrid[r][c].isMine) {
                    let count = 0;
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const nr = r + dr;
                            const nc = c + dc;
                            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && newGrid[nr][nc].isMine) {
                                count++;
                            }
                        }
                    }
                    newGrid[r][c].neighborCount = count;
                }
            }
        }
        return newGrid;
    };

    const revealCell = (r, c, currentGrid) => {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || currentGrid[r][c].isOpen || currentGrid[r][c].isFlagged) {
            return;
        }

        currentGrid[r][c].isOpen = true;

        if (currentGrid[r][c].neighborCount === 0) {
            // Flood Fill
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    revealCell(r + dr, c + dc, currentGrid);
                }
            }
        }
    };

    const handleCellClick = (r, c) => {
        if (gameState === 'lost' || gameState === 'won') return;
        if (grid[r][c].isFlagged) return; // Can't open flagged

        let newGrid = [...grid];

        // First Click: Generate Mines
        if (gameState === 'waiting') {
            newGrid = placeMines(r, c);
            setGameState('playing');
        }

        const cell = newGrid[r][c];

        if (cell.isMine) {
            // GAME OVER
            cell.isOpen = true;
            setGameState('lost');
            setSmiley('😵');
            // Reveal all mines
            newGrid.forEach(row => row.forEach(bs => {
                if (bs.isMine) bs.isOpen = true;
            }));
        } else {
            revealCell(r, c, newGrid);

            // Check Win
            let unrevealedSafe = 0;
            newGrid.forEach(row => row.forEach(bs => {
                if (!bs.isMine && !bs.isOpen) unrevealedSafe++;
            }));

            if (unrevealedSafe === 0) {
                setGameState('won');
                setSmiley('😎');
                setMineCount(0); // Force mines to 0
            }
        }

        setGrid(newGrid);
    };

    const handleRightClick = (e, r, c) => {
        e.preventDefault();
        if (gameState === 'lost' || gameState === 'won') return;
        if (grid[r][c].isOpen) return;

        const newGrid = [...grid];
        const cell = newGrid[r][c];

        if (!cell.isFlagged) {
            cell.isFlagged = true;
            setMineCount(m => m - 1);
        } else {
            cell.isFlagged = false;
            setMineCount(m => m + 1);
        }

        setGrid(newGrid);
    };

    const handleMouseDown = () => {
        if (gameState === 'playing') setSmiley('😲');
    };

    const handleMouseUp = () => {
        if (gameState === 'playing') setSmiley('😊');
    };

    return (
        <div className="minesweeper-container" onMouseUp={handleMouseUp}>
            {/* Header Panel */}
            <div className="minesweeper-panel">
                <div className="minesweeper-counter">
                    {String(Math.max(0, mineCount)).padStart(3, '0')}
                </div>
                <div
                    className="minesweeper-smiley"
                    onClick={initGame}
                >
                    {smiley}
                </div>
                <div className="minesweeper-counter">
                    {String(timer).padStart(3, '0')}
                </div>
            </div>

            {/* Grid */}
            <div className="minesweeper-grid-border">
                <div className="minesweeper-grid" onMouseLeave={handleMouseUp}>
                    {grid.map((row, rIndex) => (
                        row.map((cell, cIndex) => (
                            <div
                                key={`${rIndex}-${cIndex}`}
                                className={`ms-cell ${cell.isOpen ? 'revealed' : ''} ${cell.isMine && cell.isOpen ? 'mine exploded' : ''}`}
                                onClick={() => handleCellClick(rIndex, cIndex)}
                                onContextMenu={(e) => handleRightClick(e, rIndex, cIndex)}
                                onMouseDown={handleMouseDown}
                            >
                                {cell.isOpen && !cell.isMine && cell.neighborCount > 0 && (
                                    <span className={`val-${cell.neighborCount}`}>{cell.neighborCount}</span>
                                )}
                                {cell.isOpen && cell.isMine && '💣'}
                                {!cell.isOpen && cell.isFlagged && '🚩'}
                            </div>
                        ))
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Minesweeper;
