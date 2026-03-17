export const packageName = "@platform/utils";

export function trimToUndefined(value: string | undefined): string | undefined {
	const trimmedValue = value?.trim();

	return trimmedValue ? trimmedValue : undefined;
}

export function parsePositiveInteger(
	value: string | undefined,
	fallbackValue: number,
	label: string
): number {
	const trimmedValue = trimToUndefined(value);

	if (!trimmedValue) {
		return fallbackValue;
	}

	const parsedValue = Number(trimmedValue);

	if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
		throw new Error(`Invalid ${label}: ${value}`);
	}

	return parsedValue;
}
