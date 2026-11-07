import { getConnection } from './provider.svelte';
import { browser } from '$app/env';
import type { ParamsType, ProcedureReturnType, UntypedProcedureDef } from './types';

export function procedure<ProcedureDef extends UntypedProcedureDef>(
	def: ProcedureDef,
): (...params: ParamsType<ProcedureDef>) => Promise<ProcedureReturnType<ProcedureDef>> {
	if (!browser) {
		return () => {
			throw new Error('Cannot call a SpacetimeDB procedure during SSR');
		};
	}
	const instance = getConnection();
	const name = def.accessorName;

	type Params = ParamsType<ProcedureDef>;
	type ReturnType = ProcedureReturnType<ProcedureDef>;

	const queue: Array<{
		params: Params;
		resolve: (value: ReturnType) => void;
		reject: (err: unknown) => void;
	}> = [];

	$effect(() => {
		const connection = instance.connection;
		if (!connection) return;
		if (!queue.length) return;

		const fn = connection.reducers[name] as (...p: Params) => Promise<ReturnType>;

		const pending = queue.splice(0);
		for (const item of pending) {
			fn(...item.params).then(item.resolve, item.reject);
		}
	});

	return (...params: Params) => {
		const connection = instance.connection;
		if (!connection) {
			return new Promise<ReturnType>((resolve, reject) => {
				queue.push({ params, resolve, reject });
			});
		}
		const fn = connection.reducers[name] as (...p: Params) => Promise<ReturnType>;

		return fn(...params);
	};
}
