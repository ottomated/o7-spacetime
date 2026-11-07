import {
	AlgebraicType,
	ProductType,
	evaluateBooleanExpr,
	getQueryAccessorName,
	getQueryWhereClause,
	toSql,
	type Query,
	type TypedTableDef,
} from 'spacetimedb';
import { getConnection } from './provider.svelte';
import type { ClientTable, OnDelete, OnInsert, OnUpdate, Prettify } from './types';

class Table<Row extends Record<string, unknown>> {
	rows = $state<Row[]>([]);

	#index_map = new Map<unknown, number>();
	#get_map_key: (row: Row) => unknown;
	constructor(query: Query<TypedTableDef>) {
		const table_def = get_table_def(query);
		const pk_column = Object.entries(table_def.columns).find(
			([, column]) => column.columnMetadata.isPrimaryKey,
		);

		if (pk_column) {
			const [name, column] = pk_column;
			const key_type = column.typeBuilder.algebraicType;
			// Compare by primary key
			this.#get_map_key = (row) => AlgebraicType.intoMapKey(key_type, row[name]);
		} else {
			// Compare by entire row value
			const row_type = table_def.rowType;
			this.#get_map_key = (row) => ProductType.intoMapKey(row_type, row);
		}
	}

	insert(row: Row) {
		const key = this.#get_map_key(row);

		if (this.#index_map.has(key)) return;
		this.rows.push(row);
		this.#index_map.set(key, this.rows.length - 1);
	}
	remove(row: Row) {
		const key = this.#get_map_key(row);

		const index = this.#index_map.get(key);
		if (index === undefined) return;

		this.rows.splice(index, 1);
		this.#index_map.delete(key);
		for (const [key, other_index] of this.#index_map) {
			if (other_index > index) this.#index_map.set(key, other_index - 1);
		}
	}
	update(old_row: Row, new_row: Row) {
		const old_key = this.#get_map_key(old_row);
		const index = this.#index_map.get(old_key);
		if (index === undefined) {
			this.insert(new_row);
			return;
		}
		const old_row_state = this.rows[index];
		Object.assign(old_row_state, new_row);
		this.#index_map.delete(old_key);
		this.#index_map.set(this.#get_map_key(new_row), index);
	}
	set_rows(rows: Array<Row>) {
		this.rows = rows;
		this.#index_map.clear();
		for (let index = 0; index < rows.length; index++) {
			const key = this.#get_map_key(rows[index]!);
			this.#index_map.set(key, index);
		}
	}
}

/**
 * See getQueryAccessorName
 */
function get_table_def(query: Query<TypedTableDef>): TypedTableDef {
	const q = query as unknown as {
		tableDef?: TypedTableDef;
		table?: { tableDef?: TypedTableDef };
		sourceQuery?: { table?: { tableDef?: TypedTableDef } };
	};
	if (q.tableDef) return q.tableDef;
	if (q.table?.tableDef) return q.table.tableDef;
	if (q.sourceQuery?.table?.tableDef) return q.sourceQuery.table.tableDef;
	throw new Error('Cannot extract table def from query builder expression');
}

export function table<TableDef extends TypedTableDef>(query: Query<TableDef>) {
	type Row = Prettify<NonNullable<(typeof query)['__row']>>;

	const accessor_name = getQueryAccessorName(query);
	const where_expr = getQueryWhereClause(query);
	const query_sql = toSql(query);

	const instance = getConnection();

	const table = new Table<Row>(query);

	const on_insert: OnInsert<Row> = (_, row) => {
		if (where_expr && !evaluateBooleanExpr(where_expr, row)) return;
		console.log('insert', row);
		table.insert(row);
	};

	const on_update: OnUpdate<Row> = (_, old_row, new_row) => {
		const old_in = where_expr ? evaluateBooleanExpr(where_expr, old_row) : true;
		const new_in = where_expr ? evaluateBooleanExpr(where_expr, new_row) : true;

		if (!old_in && !new_in) return;
		if (!old_in && new_in) {
			table.insert(new_row);
			return;
		}
		if (!new_in) {
			table.remove(old_row);
			return;
		}
		table.update(old_row, new_row);
	};

	const on_delete: OnDelete<Row> = (_, row) => {
		table.remove(row);
	};

	$effect(() => {
		if (!instance.connection) {
			table.set_rows([]);
			return;
		}

		const t = instance.connection.db[accessor_name] as ClientTable<Row>;

		function get_filtered_rows() {
			const all = [...t.iter()];
			if (!where_expr) return all;
			return all.filter((row) => evaluateBooleanExpr(where_expr, row));
		}
		t.onInsert(on_insert);
		t.onUpdate(on_update);
		t.onDelete(on_delete);

		const subscription = instance.connection
			.subscriptionBuilder()
			.onApplied(() => {
				const rows = get_filtered_rows();
				table.set_rows(rows);
			})
			.subscribe(query_sql);

		return () => {
			if (subscription.isActive()) subscription.unsubscribe();
			t.removeOnInsert(on_insert);
			t.removeOnUpdate(on_update);
			t.removeOnDelete(on_delete);
		};
	});

	return table;
}
