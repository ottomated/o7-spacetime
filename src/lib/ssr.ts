import type { ProductType, AlgebraicType } from 'spacetimedb';

export type SqlResponse = [
	{
		schema: ProductType;
		rows: any[][];
	},
];

export function parse_json_row(row: any[], schema: ProductType): Record<string, any> {
	const result: Record<string, any> = {};
	for (let index = 0; index < schema.elements.length; index++) {
		const element = schema.elements[index]!;
		console.log(element);
	}
	return result;
}
