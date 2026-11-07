/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
	ColumnBuilder,
	DbConnectionBuilder,
	DbConnectionImpl,
	EventContextInterface,
	Infer,
	InferTypeOfParams,
	MaybeParams,
	TypeBuilder,
} from 'spacetimedb';

export type ParamsObj = Record<string, TypeBuilder<any, any> | ColumnBuilder<any, any, any>>;

export type ParamsType<R extends { params: ParamsObj }> = MaybeParams<
	Prettify<InferTypeOfParams<R['params']>>
>;
export type ProcedureReturnType<P extends { returnType: TypeBuilder<any, any> }> = Infer<
	P['returnType']
>;

export type UntypedBuilder = DbConnectionBuilder<UntypedDbConnection>;

export type UntypedDbConnection = DbConnectionImpl<any>;

export type UntypedReducerDef = { accessorName: string; params: ParamsObj };

export type UntypedProcedureDef = {
	accessorName: string;
	params: ParamsObj;
	returnType: TypeBuilder<any, any>;
};

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

type Ctx = EventContextInterface<any>;
export type OnInsert<Row> = (ctx: Ctx, row: Row) => void;
export type OnUpdate<Row> = (ctx: Ctx, old_row: Row, new_row: Row) => void;
export type OnDelete<Row> = (ctx: Ctx, row: Row) => void;

export type ClientTable<Row> = {
	iter: () => IteratorObject<Row, undefined, unknown>;
	onInsert: (cb: OnInsert<Row>) => void;
	onUpdate: (cb: OnUpdate<Row>) => void;
	onDelete: (cb: OnDelete<Row>) => void;
	removeOnInsert: (cb: OnInsert<Row>) => void;
	removeOnUpdate: (cb: OnUpdate<Row>) => void;
	removeOnDelete: (cb: OnDelete<Row>) => void;
};
