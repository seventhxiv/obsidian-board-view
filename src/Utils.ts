
/**
 * Removes the BasesPropertyType prefix from a BasesPropertyId.
 * Assumes the format is "type:name" and returns "name".
 * If no colon is present, returns the original string.
 * @param propertyId The property ID to process.
 * @returns The property name without the type prefix.
 */
export function getPropertyKeyFromId(propertyId: string): string {
    if (!propertyId) return '';
    const parts = propertyId.split('.');
    if (parts.length > 1) {
        return parts.slice(1).join('.');
    }
    return propertyId;
}
