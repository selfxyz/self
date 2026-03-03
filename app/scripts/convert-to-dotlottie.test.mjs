// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * @jest-environment node
 *
 * Unit tests for convert-to-dotlottie.mjs
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { readFileSync, writeFileSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCRIPT_PATH = join(__dirname, 'convert-to-dotlottie.mjs');
const TEST_DIR = join(__dirname, '.test-convert-to-dotlottie');

describe('convert-to-dotlottie.mjs', () => {
  beforeEach(() => {
    // Create test directory
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    // Cleanup test directory
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('command line interface', () => {
    it('should display usage message when no files provided', () => {
      expect(() => {
        execSync(`node "${SCRIPT_PATH}"`, {
          encoding: 'utf8',
          stdio: 'pipe'
        });
      }).toThrow();

      try {
        execSync(`node "${SCRIPT_PATH}"`, {
          encoding: 'utf8',
          stdio: 'pipe'
        });
      } catch (error) {
        expect(error.stderr).toContain('Usage:');
        expect(error.stderr).toContain('convert-to-dotlottie.mjs');
        expect(error.status).toBe(1);
      }
    });

    it('should convert a single Lottie JSON file to .lottie format', () => {
      const inputFile = join(TEST_DIR, 'test-animation.json');
      const outputFile = join(TEST_DIR, 'test-animation.lottie');

      // Create a minimal valid Lottie JSON
      const lottieJson = {
        v: '5.7.4',
        fr: 30,
        ip: 0,
        op: 60,
        w: 1920,
        h: 1080,
        nm: 'Test Animation',
        ddd: 0,
        assets: [],
        layers: []
      };

      writeFileSync(inputFile, JSON.stringify(lottieJson), 'utf8');
      const inputSize = statSync(inputFile).size;

      // Run the conversion
      const output = execSync(`node "${SCRIPT_PATH}" "${inputFile}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Verify output file exists
      expect(() => statSync(outputFile)).not.toThrow();

      // Verify output message
      expect(output).toContain('test-animation.json');
      expect(output).toContain('test-animation.lottie');
      expect(output).toContain('KB');
      expect(output).toContain('smaller');

      // Verify compression occurred
      const outputSize = statSync(outputFile).size;
      expect(outputSize).toBeLessThan(inputSize);
    });

    it('should convert multiple Lottie JSON files', () => {
      const inputFile1 = join(TEST_DIR, 'anim1.json');
      const inputFile2 = join(TEST_DIR, 'anim2.json');
      const outputFile1 = join(TEST_DIR, 'anim1.lottie');
      const outputFile2 = join(TEST_DIR, 'anim2.lottie');

      const lottieJson = {
        v: '5.7.4',
        fr: 30,
        ip: 0,
        op: 30,
        w: 1920,
        h: 1080,
        nm: 'Test',
        ddd: 0,
        assets: [],
        layers: []
      };

      writeFileSync(inputFile1, JSON.stringify(lottieJson), 'utf8');
      writeFileSync(inputFile2, JSON.stringify(lottieJson), 'utf8');

      const output = execSync(`node "${SCRIPT_PATH}" "${inputFile1}" "${inputFile2}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Verify both output files exist
      expect(() => statSync(outputFile1)).not.toThrow();
      expect(() => statSync(outputFile2)).not.toThrow();

      // Verify output messages for both files
      expect(output).toContain('anim1.json');
      expect(output).toContain('anim2.json');
    });

    it('should handle files in nested directories', () => {
      const nestedDir = join(TEST_DIR, 'nested', 'path');
      mkdirSync(nestedDir, { recursive: true });

      const inputFile = join(nestedDir, 'nested-anim.json');
      const outputFile = join(nestedDir, 'nested-anim.lottie');

      const lottieJson = {
        v: '5.7.4',
        fr: 30,
        ip: 0,
        op: 30,
        w: 100,
        h: 100,
        nm: 'Nested',
        ddd: 0,
        assets: [],
        layers: []
      };

      writeFileSync(inputFile, JSON.stringify(lottieJson), 'utf8');

      execSync(`node "${SCRIPT_PATH}" "${inputFile}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      expect(() => statSync(outputFile)).not.toThrow();
    });

    it('should handle large Lottie files', () => {
      const inputFile = join(TEST_DIR, 'large-animation.json');
      const outputFile = join(TEST_DIR, 'large-animation.lottie');

      // Create a larger Lottie JSON with multiple layers
      const largeLottieJson = {
        v: '5.7.4',
        fr: 60,
        ip: 0,
        op: 300,
        w: 1920,
        h: 1080,
        nm: 'Large Animation',
        ddd: 0,
        assets: Array(50).fill(null).map((_, i) => ({
          id: `asset_${i}`,
          w: 100,
          h: 100,
          u: '',
          p: `image_${i}.png`,
          e: 0
        })),
        layers: Array(100).fill(null).map((_, i) => ({
          ddd: 0,
          ind: i,
          ty: 4,
          nm: `Layer ${i}`,
          sr: 1,
          ks: {
            o: { a: 0, k: 100 },
            r: { a: 0, k: 0 },
            p: { a: 0, k: [960, 540, 0] },
            a: { a: 0, k: [0, 0, 0] },
            s: { a: 0, k: [100, 100, 100] }
          },
          ao: 0,
          shapes: [],
          ip: 0,
          op: 300,
          st: 0,
          bm: 0
        }))
      };

      writeFileSync(inputFile, JSON.stringify(largeLottieJson), 'utf8');
      const inputSize = statSync(inputFile).size;

      const output = execSync(`node "${SCRIPT_PATH}" "${inputFile}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      expect(() => statSync(outputFile)).not.toThrow();

      const outputSize = statSync(outputFile).size;
      expect(outputSize).toBeLessThan(inputSize);

      // Verify compression percentage is calculated
      expect(output).toMatch(/\d+\.?\d*% smaller/);
    });

    it('should display compression statistics', () => {
      const inputFile = join(TEST_DIR, 'stats-test.json');

      const lottieJson = {
        v: '5.7.4',
        fr: 30,
        ip: 0,
        op: 60,
        w: 1920,
        h: 1080,
        nm: 'Stats Test',
        ddd: 0,
        assets: [],
        layers: []
      };

      writeFileSync(inputFile, JSON.stringify(lottieJson, null, 2), 'utf8');

      const output = execSync(`node "${SCRIPT_PATH}" "${inputFile}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Verify output contains file names
      expect(output).toContain('stats-test.json');
      expect(output).toContain('stats-test.lottie');

      // Verify output contains size information
      expect(output).toMatch(/\d+KB → \d+KB/);

      // Verify output contains compression percentage
      expect(output).toMatch(/\d+\.?\d*% smaller/);
    });

    it('should fail gracefully on invalid JSON', () => {
      const inputFile = join(TEST_DIR, 'invalid.json');
      writeFileSync(inputFile, 'not valid json{', 'utf8');

      expect(() => {
        execSync(`node "${SCRIPT_PATH}" "${inputFile}"`, {
          encoding: 'utf8',
          stdio: 'pipe'
        });
      }).toThrow();
    });

    it('should fail gracefully on non-existent file', () => {
      const nonExistentFile = join(TEST_DIR, 'does-not-exist.json');

      expect(() => {
        execSync(`node "${SCRIPT_PATH}" "${nonExistentFile}"`, {
          encoding: 'utf8',
          stdio: 'pipe'
        });
      }).toThrow();
    });
  });

  describe('output format', () => {
    it('should create .lottie file with same base name as input', () => {
      const inputFile = join(TEST_DIR, 'my-animation.json');
      const outputFile = join(TEST_DIR, 'my-animation.lottie');

      const lottieJson = {
        v: '5.7.4',
        fr: 30,
        ip: 0,
        op: 30,
        w: 100,
        h: 100,
        nm: 'Test',
        ddd: 0,
        assets: [],
        layers: []
      };

      writeFileSync(inputFile, JSON.stringify(lottieJson), 'utf8');

      execSync(`node "${SCRIPT_PATH}" "${inputFile}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      expect(() => statSync(outputFile)).not.toThrow();

      // Verify it's a valid binary file (not empty)
      const outputSize = statSync(outputFile).size;
      expect(outputSize).toBeGreaterThan(0);
    });

    it('should preserve original .json file', () => {
      const inputFile = join(TEST_DIR, 'preserve-test.json');

      const lottieJson = {
        v: '5.7.4',
        fr: 30,
        ip: 0,
        op: 30,
        w: 100,
        h: 100,
        nm: 'Test',
        ddd: 0,
        assets: [],
        layers: []
      };

      const originalContent = JSON.stringify(lottieJson);
      writeFileSync(inputFile, originalContent, 'utf8');

      execSync(`node "${SCRIPT_PATH}" "${inputFile}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Verify original file still exists and hasn't been modified
      const afterContent = readFileSync(inputFile, 'utf8');
      expect(afterContent).toBe(originalContent);
    });

    it('should overwrite existing .lottie file', () => {
      const inputFile = join(TEST_DIR, 'overwrite-test.json');
      const outputFile = join(TEST_DIR, 'overwrite-test.lottie');

      const lottieJson = {
        v: '5.7.4',
        fr: 30,
        ip: 0,
        op: 30,
        w: 100,
        h: 100,
        nm: 'Test',
        ddd: 0,
        assets: [],
        layers: []
      };

      writeFileSync(inputFile, JSON.stringify(lottieJson), 'utf8');

      // Create existing .lottie file with different content
      writeFileSync(outputFile, 'old content', 'utf8');
      const oldSize = statSync(outputFile).size;

      execSync(`node "${SCRIPT_PATH}" "${inputFile}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Verify file was overwritten
      const newSize = statSync(outputFile).size;
      expect(newSize).not.toBe(oldSize);
    });
  });

  describe('edge cases', () => {
    it('should handle minimal Lottie JSON', () => {
      const inputFile = join(TEST_DIR, 'minimal.json');
      const outputFile = join(TEST_DIR, 'minimal.lottie');

      const minimalLottie = {
        v: '5.7.4',
        fr: 30,
        ip: 0,
        op: 1,
        w: 1,
        h: 1,
        nm: 'Min',
        ddd: 0,
        assets: [],
        layers: []
      };

      writeFileSync(inputFile, JSON.stringify(minimalLottie), 'utf8');

      execSync(`node "${SCRIPT_PATH}" "${inputFile}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      expect(() => statSync(outputFile)).not.toThrow();
    });

    it('should handle Lottie JSON with Unicode characters', () => {
      const inputFile = join(TEST_DIR, 'unicode-test.json');
      const outputFile = join(TEST_DIR, 'unicode-test.lottie');

      const unicodeLottie = {
        v: '5.7.4',
        fr: 30,
        ip: 0,
        op: 30,
        w: 100,
        h: 100,
        nm: 'Test with 日本語 and émojis 🎨',
        ddd: 0,
        assets: [],
        layers: []
      };

      writeFileSync(inputFile, JSON.stringify(unicodeLottie), 'utf8');

      execSync(`node "${SCRIPT_PATH}" "${inputFile}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      expect(() => statSync(outputFile)).not.toThrow();
    });

    it('should handle file paths with spaces', () => {
      const spacedDir = join(TEST_DIR, 'folder with spaces');
      mkdirSync(spacedDir, { recursive: true });

      const inputFile = join(spacedDir, 'file with spaces.json');
      const outputFile = join(spacedDir, 'file with spaces.lottie');

      const lottieJson = {
        v: '5.7.4',
        fr: 30,
        ip: 0,
        op: 30,
        w: 100,
        h: 100,
        nm: 'Test',
        ddd: 0,
        assets: [],
        layers: []
      };

      writeFileSync(inputFile, JSON.stringify(lottieJson), 'utf8');

      execSync(`node "${SCRIPT_PATH}" "${inputFile}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      expect(() => statSync(outputFile)).not.toThrow();
    });

    it('should calculate compression percentage correctly', () => {
      const inputFile = join(TEST_DIR, 'compression-calc.json');

      // Create a file with known size
      const lottieJson = {
        v: '5.7.4',
        fr: 30,
        ip: 0,
        op: 30,
        w: 1920,
        h: 1080,
        nm: 'Compression Test',
        ddd: 0,
        assets: [],
        layers: [],
        // Add some extra data to make compression more significant
        metadata: {
          description: 'This is a test animation with extra metadata to test compression ratios and ensure the output is significantly smaller than the input file size for proper validation of the compression algorithm effectiveness.'
        }
      };

      writeFileSync(inputFile, JSON.stringify(lottieJson, null, 2), 'utf8');

      const output = execSync(`node "${SCRIPT_PATH}" "${inputFile}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Extract the percentage from output
      const percentMatch = output.match(/(\d+\.?\d*)% smaller/);
      expect(percentMatch).not.toBeNull();

      const percentage = parseFloat(percentMatch[1]);
      expect(percentage).toBeGreaterThan(0);
      expect(percentage).toBeLessThan(100);
    });
  });
});