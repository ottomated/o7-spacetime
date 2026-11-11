import { Uuid } from 'spacetimedb';

//#region Types
type AlgebraicType =
	| {
			Sum: SumType;
	  }
	| { Product: ProductType }
	| BuiltinType;

type BuiltinType =
	| { Bool: [] }
	| { I8: [] }
	| { U8: [] }
	| { I16: [] }
	| { U16: [] }
	| { I32: [] }
	| { U32: [] }
	| { I64: [] }
	| { U64: [] }
	| { I128: [] }
	| { U128: [] }
	| { U256: [] }
	| { I256: [] }
	| { F32: [] }
	| { F64: [] }
	| { String: [] }
	| { Array: AlgebraicType }
	| {
			Map: {
				key_ty: AlgebraicType;
				ty: AlgebraicType;
			};
	  };

type SumTypeVariant = {
	algebraic_type: AlgebraicType;
	name: { some: string } | { none: [] };
};
type SumType = {
	variants: Array<SumTypeVariant>;
};

type ProductTypeElement = {
	algebraic_type: AlgebraicType;
	name: { some: string } | { none: [] };
};
type ProductType = {
	elements: Array<ProductTypeElement>;
};
//#endregion

//#region Values
type AlgebraicValue = SumValue | ProductValue | BuiltinValue;
type SumValue = { tag: number };
//#endregion

// Why ssr won't work:
// - have to maintain a SATS-JSON parser in typescript
// - SATS-JSON doesn't support large numbers, so no uuids or anything above u32, silent loss of precision
// - per spacetimedb docs, this endpoint isn't designed for performance
export function parse_json_row(row: any[], schema: ProductType): Record<string, any> {
	const result: Record<string, any> = {};
	for (let index = 0; index < schema.elements.length; index++) {
		const element = schema.elements[index]!;
		console.log(element.name.some, row[index], JSON.stringify(element.algebraic_type));
		if (element.name.some === 'uuid') {
			console.log(row[index][0]);
			console.log(new Uuid(row[index][0]));
		}
	}
	console.log(row);
	return result;
}
