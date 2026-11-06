import {
	evaluateBooleanExpr,
	getQueryAccessorName,
	getQueryWhereClause,
	toSql,
	type ClientTable,
	type Query,
	type RowTypedQuery,
	type TypedTableDef,
} from 'spacetimedb';
import { getConnection } from './provider.svelte';

/**
 * Extracts the row type produced by a query.
 *
 * `Query<TableDef>` is an alias for `RowTypedQuery<RowType<TableDef>, TableDef['rowType']>`,
 * so the row type is recoverable from the query type itself via `__row`.
 */
type QueryRow<Q> = Q extends RowTypedQuery<infer Row, unknown> ? Row : never;

class Table<Row> {
	rows = $state<Row[]>([]);
}

type OnInsert = Parameters<ClientTable<any, string>['onInsert']>[0];
type OnUpdate = Parameters<ClientTable<any, string>['onUpdate']>[0];
type OnDelete = Parameters<ClientTable<any, string>['onDelete']>[0];

export function table<TableDef extends TypedTableDef>(query: Query<TableDef>) {
	type Row = QueryRow<typeof query>;
	const accessor_name = getQueryAccessorName(query);
	const where_expr = getQueryWhereClause(query);
	const query_sql = toSql(query);

	const instance = getConnection();

	const table = new Table<Row>();

	const on_insert: OnInsert = (ctx, row) => {
		if (where_expr && !evaluateBooleanExpr(where_expr, row)) return;

		console.log('insert', query_sql, row);
	};

	$effect(() => {
		if (!instance.connection) {
			table.rows = [];
			return;
		}

		const t = instance.connection.db[accessor_name] as ClientTable<any, string>;
		function get_filtered_rows() {
			const all = [...t.iter()] as Array<Row>;
			if (!where_expr) return all;
			return all.filter((row) => evaluateBooleanExpr(where_expr, row));
		}
		t.onInsert(on_insert);

		const subscription = instance.connection
			.subscriptionBuilder()
			.onApplied(() => {
				table.rows = get_filtered_rows();
			})
			.subscribe(query_sql);

		return () => {
			if (subscription.isActive()) subscription.unsubscribe();
			t.removeOnInsert(on_insert);
		};
	});

	return table;
}
