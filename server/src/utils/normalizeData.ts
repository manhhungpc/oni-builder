/**
 * Normalizes MongoDB data by converting ObjectId format to plain strings
 */
export function normalizeData<T = any>(data: T | T[]): T | T[] {
    if (Array.isArray(data)) {
        return data.map((item) => normalizeSingleItem(item));
    }
    return normalizeSingleItem(data);
}

function normalizeSingleItem<T = any>(item: any): T {
    if (!item || typeof item !== 'object') {
        return item;
    }

    const normalized: any = {};

    for (const [key, value] of Object.entries(item)) {
        if (key === '_id' && value && typeof value === 'object' && '$oid' in value) {
            // Convert MongoDB ObjectId to string and rename to 'id'
            normalized._id = value.$oid;
        } else if (value && typeof value === 'object' && '$oid' in value) {
            // Handle any other ObjectId fields
            normalized[key] = value.$oid;
        } else if (Array.isArray(value)) {
            // Recursively handle arrays
            normalized[key] = value.map((v) => normalizeSingleItem(v));
        } else if (value && typeof value === 'object') {
            // Recursively handle nested objects
            normalized[key] = normalizeSingleItem(value);
        } else {
            // Copy primitive values as-is
            normalized[key] = value;
        }
    }

    return normalized;
}
