/**
 * Demo: What can the current codebase do?
 */

import {
  GameState,
  Board,
  Piece,
  Color,
  PieceType,
  PositionUtils,
  GameRules,
  GameResult,
} from '../index';

console.log('='.repeat(60));
console.log('Chess Domain Model - Feature Demonstration');
console.log('='.repeat(60));

// 1. 標準ゲームの作成
console.log('\n1. 標準ゲームの初期化');
console.log('-'.repeat(60));
const game = GameState.createStandard();
console.log(game.board.toString());
console.log(`現在のターン: ${game.currentTurn}`);
console.log(`手数: ${game.fullMoveNumber}`);

// 2. 合法手の取得
console.log('\n2. 合法手の取得（白の全ての合法手）');
console.log('-'.repeat(60));
const allLegalMoves = game.getLegalMoves();
console.log(`合法手の総数: ${allLegalMoves.length}`);
console.log(`最初の10手:`);
allLegalMoves.slice(0, 10).forEach((move, i) => {
  console.log(`  ${i + 1}. ${PositionUtils.toAlgebraic(move.from)} -> ${PositionUtils.toAlgebraic(move.to)}`);
});

// 3. 特定の駒の合法手
console.log('\n3. 特定の駒の合法手（e2のポーン）');
console.log('-'.repeat(60));
const e2Pawn = game.board.getPiece({ file: 4, rank: 1 });
if (e2Pawn) {
  const pawnMoves = game.getLegalMovesForPiece(e2Pawn);
  console.log(`e2のポーンの合法手: ${pawnMoves.length}手`);
  pawnMoves.forEach((move) => {
    console.log(`  ${PositionUtils.toAlgebraic(move.from)} -> ${PositionUtils.toAlgebraic(move.to)}`);
  });
}

// 4. 実際に手を指す
console.log('\n4. 手を指す（e2-e4）');
console.log('-'.repeat(60));
let currentGame = game;
const move1 = currentGame.makeMove(
  PositionUtils.fromAlgebraic('e2'),
  PositionUtils.fromAlgebraic('e4')
);
if (move1.success && move1.newState) {
  currentGame = move1.newState;
  console.log('✓ 手が成功しました');
  console.log(currentGame.board.toString());
  console.log(`現在のターン: ${currentGame.currentTurn}`);
  console.log(`チェック状態: ${currentGame.isInCheck() ? 'Yes' : 'No'}`);
}

// 5. 連続して手を指す
console.log('\n5. 連続して手を指す');
console.log('-'.repeat(60));
const moves = [
  { from: 'e7', to: 'e5', desc: '黒: e7-e5' },
  { from: 'd1', to: 'h5', desc: '白: Qd1-h5' },
  { from: 'b8', to: 'c6', desc: '黒: Nb8-c6' },
  { from: 'f1', to: 'c4', desc: '白: Bf1-c4' },
  { from: 'g8', to: 'f6', desc: '黒: Ng8-f6' },
];

for (const move of moves) {
  const result = currentGame.makeMove(
    PositionUtils.fromAlgebraic(move.from),
    PositionUtils.fromAlgebraic(move.to)
  );
  if (result.success && result.newState) {
    currentGame = result.newState;
    console.log(`✓ ${move.desc}`);
  }
}

console.log('\n現在の盤面:');
console.log(currentGame.board.toString());

// 6. カスタム盤面の作成
console.log('\n6. カスタム盤面の作成（エンドゲーム）');
console.log('-'.repeat(60));
const customPieces: Piece[] = [
  new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
  new Piece(PieceType.Queen, Color.White, { file: 3, rank: 6 }),
  new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
  new Piece(PieceType.Pawn, Color.Black, { file: 3, rank: 6 }),
];

const customBoard = new Board(customPieces);
const customGame = GameState.createCustom(customBoard, Color.White);
console.log(customBoard.toString());

// 7. チェック判定
console.log('\n7. チェック判定');
console.log('-'.repeat(60));
const checkPieces: Piece[] = [
  new Piece(PieceType.King, Color.White, { file: 4, rank: 0 }),
  new Piece(PieceType.King, Color.Black, { file: 4, rank: 7 }),
  new Piece(PieceType.Rook, Color.Black, { file: 4, rank: 5 }),
];
const checkBoard = new Board(checkPieces);
console.log(checkBoard.toString());
console.log(`白のキングはチェックされている: ${GameRules.isInCheck(checkBoard, Color.White)}`);
console.log(`黒のキングはチェックされている: ${GameRules.isInCheck(checkBoard, Color.Black)}`);

// 8. ステイルメイト判定
console.log('\n8. ステイルメイト判定');
console.log('-'.repeat(60));
const stalematePieces: Piece[] = [
  new Piece(PieceType.King, Color.White, { file: 0, rank: 0 }),
  new Piece(PieceType.King, Color.Black, { file: 2, rank: 1 }),
  new Piece(PieceType.Queen, Color.Black, { file: 1, rank: 2 }),
];
const stalemateBoard = new Board(stalematePieces);
console.log(stalemateBoard.toString());
console.log(`白のキングはチェックされている: ${GameRules.isInCheck(stalemateBoard, Color.White)}`);
console.log(`ステイルメイト: ${GameRules.isStalemate(stalemateBoard, Color.White)}`);

// 9. 駒の価値計算
console.log('\n9. 駒の価値計算');
console.log('-'.repeat(60));
const standardBoard = Board.createStandard();
let whiteMaterial = 0;
let blackMaterial = 0;
standardBoard.getAllPieces().forEach(piece => {
  if (piece.color === Color.White) {
    whiteMaterial += piece.getValue();
  } else {
    blackMaterial += piece.getValue();
  }
});
console.log(`白の駒の価値合計: ${whiteMaterial}`);
console.log(`黒の駒の価値合計: ${blackMaterial}`);

// 10. FEN記法
console.log('\n10. FEN記法（簡易版）');
console.log('-'.repeat(60));
const fenGame = GameState.createStandard();
console.log(`FEN: ${fenGame.toFEN()}`);

// 11. キャスリング可能性チェック
console.log('\n11. キャスリングの可能性');
console.log('-'.repeat(60));
const initialGame = GameState.createStandard();
const whiteKing = initialGame.board.getKing(Color.White);
if (whiteKing) {
  const kingMoves = GameRules.getLegalMoves(whiteKing, initialGame.board);
  console.log(`初期配置でのキングの合法手: ${kingMoves.length}手`);
  console.log('(キャスリングは駒が間にあるため不可能)');
}

// 12. 駒の種類ごとのカウント
console.log('\n12. 駒の種類ごとのカウント');
console.log('-'.repeat(60));
const pieceCount = {
  [PieceType.Pawn]: 0,
  [PieceType.Knight]: 0,
  [PieceType.Bishop]: 0,
  [PieceType.Rook]: 0,
  [PieceType.Queen]: 0,
  [PieceType.King]: 0,
};
standardBoard.getAllPieces().forEach(piece => {
  pieceCount[piece.type]++;
});
console.log(`ポーン: ${pieceCount[PieceType.Pawn]}`);
console.log(`ナイト: ${pieceCount[PieceType.Knight]}`);
console.log(`ビショップ: ${pieceCount[PieceType.Bishop]}`);
console.log(`ルーク: ${pieceCount[PieceType.Rook]}`);
console.log(`クイーン: ${pieceCount[PieceType.Queen]}`);
console.log(`キング: ${pieceCount[PieceType.King]}`);

// 13. 不正な手の処理
console.log('\n13. 不正な手の処理');
console.log('-'.repeat(60));
const testGame = GameState.createStandard();
const illegalMove = testGame.makeMove(
  PositionUtils.fromAlgebraic('e2'),
  PositionUtils.fromAlgebraic('e5') // e2からe5は不正（2マス以上の移動）
);
console.log(`不正な手の結果: ${illegalMove.success ? '成功' : '失敗'}`);
if (!illegalMove.success) {
  console.log(`エラーメッセージ: ${illegalMove.error}`);
}

// 14. ゲーム状態のクローン
console.log('\n14. ゲーム状態のクローン（What-if分析に有用）');
console.log('-'.repeat(60));
const originalGame = GameState.createStandard();
const clonedGame = originalGame.clone();
console.log('元のゲームとクローンは独立しています');
console.log(`元のゲーム: ターン=${originalGame.currentTurn}, 手数=${originalGame.fullMoveNumber}`);
console.log(`クローン: ターン=${clonedGame.currentTurn}, 手数=${clonedGame.fullMoveNumber}`);

console.log('\n' + '='.repeat(60));
console.log('デモンストレーション完了');
console.log('='.repeat(60));
