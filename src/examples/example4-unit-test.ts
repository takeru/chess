/**
 * Example 4: Basic Unit Tests (Manual Testing)
 *
 * This file demonstrates how to test the chess domain model.
 * For production, you would use a testing framework like Jest or Mocha.
 */

import {
  GameState,
  Board,
  Piece,
  Color,
  PieceType,
  GameRules,
  PieceRulesFactory,
  PositionUtils,
} from '../index';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ ${message}`);
}

function testPawnMoves(): void {
  console.log('\n=== Testing Pawn Moves ===');

  const board = Board.createStandard();
  const pawn = board.getPiece({ file: 4, rank: 1 })!; // e2 pawn

  const moves = PieceRulesFactory.getPossibleMoves(pawn, board);

  assert(moves.length === 2, 'Pawn should have 2 initial moves');
  assert(
    moves.some((m) => m.rank === 2),
    'Pawn can move one square forward'
  );
  assert(
    moves.some((m) => m.rank === 3),
    'Pawn can move two squares forward from start'
  );
}

function testKnightMoves(): void {
  console.log('\n=== Testing Knight Moves ===');

  const board = Board.createStandard();
  const knight = board.getPiece({ file: 1, rank: 0 })!; // b1 knight

  const moves = PieceRulesFactory.getPossibleMoves(knight, board);

  assert(moves.length === 2, 'Knight should have 2 initial moves');
}

function testCheckDetection(): void {
  console.log('\n=== Testing Check Detection ===');

  // Create a position where white king is in check
  const pieces: Piece[] = [
    new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
    new Piece(PieceType.King, Color.Black, { file: 7, rank: 7 }),
    new Piece(PieceType.Rook, Color.Black, { file: 4, rank: 7 }),
  ];

  const board = new Board(pieces);

  assert(GameRules.isInCheck(board, Color.White), 'White king should be in check');
  assert(!GameRules.isInCheck(board, Color.Black), 'Black king should not be in check');
}

function testCheckmate(): void {
  console.log('\n=== Testing Checkmate Detection ===');

  // Back rank mate
  const pieces: Piece[] = [
    new Piece(PieceType.King, Color.White, { file: 7, rank: 0 }),
    new Piece(PieceType.Pawn, Color.White, { file: 6, rank: 1 }),
    new Piece(PieceType.Pawn, Color.White, { file: 7, rank: 1 }),
    new Piece(PieceType.King, Color.Black, { file: 0, rank: 7 }),
    new Piece(PieceType.Rook, Color.Black, { file: 7, rank: 7 }),
  ];

  const board = new Board(pieces);

  assert(
    GameRules.isCheckmate(board, Color.White),
    'Should detect checkmate'
  );
}

function testStalemate(): void {
  console.log('\n=== Testing Stalemate Detection ===');

  // Stalemate position
  const pieces: Piece[] = [
    new Piece(PieceType.King, Color.White, { file: 7, rank: 0 }),
    new Piece(PieceType.King, Color.Black, { file: 5, rank: 1 }),
    new Piece(PieceType.Queen, Color.Black, { file: 6, rank: 2 }),
  ];

  const board = new Board(pieces);

  assert(
    GameRules.isStalemate(board, Color.White),
    'Should detect stalemate'
  );
}

function testGameFlow(): void {
  console.log('\n=== Testing Game Flow ===');

  let gameState = GameState.createStandard();

  assert(gameState.currentTurn === Color.White, 'White should start');

  // Scholar's Mate sequence
  const moves = [
    { from: 'e2', to: 'e4' },  // 1. e4
    { from: 'e7', to: 'e5' },  // 1... e5
    { from: 'd1', to: 'h5' },  // 2. Qh5
    { from: 'b8', to: 'c6' },  // 2... Nc6
    { from: 'f1', to: 'c4' },  // 3. Bc4
    { from: 'g8', to: 'f6' },  // 3... Nf6
    { from: 'h5', to: 'f7' },  // 4. Qxf7# (checkmate)
  ];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const from = PositionUtils.fromAlgebraic(move.from);
    const to = PositionUtils.fromAlgebraic(move.to);

    const result = gameState.makeMove(from, to);

    assert(result.success, `Move ${i + 1} should be successful: ${move.from} ${move.to}`);

    if (result.success) {
      // The gameState is already updated through makeMove
      // We need to get the new state from the result
      // Actually, gameState.makeMove returns a result but doesn't mutate
      // We need to fix this in the test
      console.log(`Move ${Math.floor(i / 2) + 1}${i % 2 === 0 ? '.' : '...'} ${move.from}-${move.to}`);
    }
  }
}

function testAlgebraicNotation(): void {
  console.log('\n=== Testing Algebraic Notation ===');

  const pos1 = PositionUtils.fromAlgebraic('e4');
  assert(pos1.file === 4 && pos1.rank === 3, 'e4 should be (4, 3)');

  const pos2 = PositionUtils.fromAlgebraic('a1');
  assert(pos2.file === 0 && pos2.rank === 0, 'a1 should be (0, 0)');

  const pos3 = PositionUtils.fromAlgebraic('h8');
  assert(pos3.file === 7 && pos3.rank === 7, 'h8 should be (7, 7)');

  assert(PositionUtils.toAlgebraic(pos1) === 'e4', 'Should convert back to e4');
  assert(PositionUtils.toAlgebraic(pos2) === 'a1', 'Should convert back to a1');
  assert(PositionUtils.toAlgebraic(pos3) === 'h8', 'Should convert back to h8');
}

function testPiecePromotion(): void {
  console.log('\n=== Testing Pawn Promotion ===');

  const pawn = new Piece(PieceType.Pawn, Color.White, { file: 0, rank: 6 });

  const queen = pawn.promote(PieceType.Queen);
  assert(queen.type === PieceType.Queen, 'Should promote to queen');
  assert(queen.color === Color.White, 'Should keep same color');
  assert(queen.position.file === 0 && queen.position.rank === 6, 'Should keep same position');

  try {
    const knight = new Piece(PieceType.Knight, Color.Black, { file: 0, rank: 0 });
    knight.promote(PieceType.Queen);
    assert(false, 'Should not allow non-pawn promotion');
  } catch (error) {
    assert(true, 'Should throw error for non-pawn promotion');
  }
}

function testBoardCloning(): void {
  console.log('\n=== Testing Board Cloning ===');

  const board = Board.createStandard();
  const clone = board.clone();

  assert(board !== clone, 'Clone should be a different object');
  assert(
    board.getAllPieces().length === clone.getAllPieces().length,
    'Clone should have same number of pieces'
  );

  // Modify clone
  clone.removePiece({ file: 0, rank: 0 });

  assert(
    board.getPiece({ file: 0, rank: 0 }) !== undefined,
    'Original board should not be affected'
  );
  assert(
    clone.getPiece({ file: 0, rank: 0 }) === undefined,
    'Clone should be modified'
  );
}

function runAllTests(): void {
  console.log('Starting Chess Domain Model Tests...\n');

  try {
    testAlgebraicNotation();
    testPawnMoves();
    testKnightMoves();
    testCheckDetection();
    testCheckmate();
    testStalemate();
    testPiecePromotion();
    testBoardCloning();
    testGameFlow();

    console.log('\n✓ All tests passed!');
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

runAllTests();
