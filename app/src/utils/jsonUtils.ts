// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Safely parses a JSON string with error handling.
 * Returns a default value if parsing fails.
 *
 * @param jsonString - The JSON string to parse
 * @param defaultValue - The default value to return if parsing fails
 * @returns The parsed object or the default value
 */
export function safeJsonParse<T>(
  jsonString: string | null | undefined,
  defaultValue: T,
): T {
  if (jsonString == null) {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON, using default value:', error);
    return defaultValue;
  }
}

/**
 * Safely stringifies an object with error handling.
 * Returns a default string if stringification fails.
 *
 * @param obj - The object to stringify
 * @param defaultValue - The default string to return if stringification fails
 * @returns The JSON string or the default string
 */
export function safeJsonStringify<T>(
  obj: T,
  defaultValue: string = '{}',
): string {
  if (obj == null) {
    return defaultValue;
  }

  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.warn('Failed to stringify JSON, using default value:', error);
    return defaultValue;
  }
}
