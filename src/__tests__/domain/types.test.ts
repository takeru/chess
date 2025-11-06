/**
 * Tests for domain types and utilities
 */

import { Color, ColorUtils, Position, PositionUtils, PieceType } from '../../domain/types';

describe('ColorUtils', () => {
  test('opposite should return opposite color', () => {
    expect(ColorUtils.opposite(Color.White)).toBe(Color.Black);
    expect(ColorUtils.opposite(Color.Black)).toBe(Color.White);
  });
});

describe('PositionUtils', () => {
  describe('isValid', () => {
    test('should return true for valid positions', () => {
      expect(PositionUtils.isValid({ file: 0, rank: 0 })).toBe(true);
      expect(PositionUtils.isValid({ file: 7, rank: 7 })).toBe(true);
      expect(PositionUtils.isValid({ file: 3, rank: 4 })).toBe(true);
    });

    test('should return false for invalid positions', () => {
      expect(PositionUtils.isValid({ file: -1, rank: 0 })).toBe(false);
      expect(PositionUtils.isValid({ file: 0, rank: -1 })).toBe(false);
      expect(PositionUtils.isValid({ file: 8, rank: 0 })).toBe(false);
      expect(PositionUtils.isValid({ file: 0, rank: 8 })).toBe(false);
    });
  });

  describe('equals', () => {
    test('should return true for equal positions', () => {
      expect(PositionUtils.equals({ file: 0, rank: 0 }, { file: 0, rank: 0 })).toBe(true);
      expect(PositionUtils.equals({ file: 3, rank: 4 }, { file: 3, rank: 4 })).toBe(true);
    });

    test('should return false for different positions', () => {
      expect(PositionUtils.equals({ file: 0, rank: 0 }, { file: 0, rank: 1 })).toBe(false);
      expect(PositionUtils.equals({ file: 0, rank: 0 }, { file: 1, rank: 0 })).toBe(false);
    });
  });

  describe('toAlgebraic', () => {
    test('should convert position to algebraic notation', () => {
      expect(PositionUtils.toAlgebraic({ file: 0, rank: 0 })).toBe('a1');
      expect(PositionUtils.toAlgebraic({ file: 4, rank: 3 })).toBe('e4');
      expect(PositionUtils.toAlgebraic({ file: 7, rank: 7 })).toBe('h8');
    });
  });

  describe('fromAlgebraic', () => {
    test('should convert algebraic notation to position', () => {
      expect(PositionUtils.fromAlgebraic('a1')).toEqual({ file: 0, rank: 0 });
      expect(PositionUtils.fromAlgebraic('e4')).toEqual({ file: 4, rank: 3 });
      expect(PositionUtils.fromAlgebraic('h8')).toEqual({ file: 7, rank: 7 });
    });

    test('should throw error for invalid notation', () => {
      expect(() => PositionUtils.fromAlgebraic('z9')).toThrow();
      expect(() => PositionUtils.fromAlgebraic('a9')).toThrow();
      expect(() => PositionUtils.fromAlgebraic('i1')).toThrow();
    });
  });

  describe('roundtrip conversion', () => {
    test('should convert back and forth correctly', () => {
      const positions = [
        { file: 0, rank: 0 },
        { file: 3, rank: 4 },
        { file: 7, rank: 7 },
      ];

      positions.forEach((pos) => {
        const algebraic = PositionUtils.toAlgebraic(pos);
        const converted = PositionUtils.fromAlgebraic(algebraic);
        expect(converted).toEqual(pos);
      });
    });
  });
});
