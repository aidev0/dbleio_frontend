/**
 * Utility functions for converting between MongoDB snake_case and JavaScript camelCase
 */

export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export function convertKeysToCamel(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamel(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Keep _id as is
      if (key === '_id') {
        converted[key] = value;
      } else {
        const camelKey = snakeToCamel(key);
        converted[camelKey] = convertKeysToCamel(value);
      }
    }

    return converted;
  }

  return obj;
}

export function convertKeysToSnake(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToSnake(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Keep _id as is
      if (key === '_id') {
        converted[key] = value;
      } else {
        const snakeKey = camelToSnake(key);
        converted[snakeKey] = convertKeysToSnake(value);
      }
    }

    return converted;
  }

  return obj;
}
