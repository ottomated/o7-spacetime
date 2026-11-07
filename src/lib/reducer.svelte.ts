import { getConnection } from './provider.svelte';
import { browser } from '$app/env';
import type { ParamsType, UntypedProcedureDef } from './types';

export function reducer<ReducerDef extends UntypedProcedureDef>(
	def: ReducerDef,
): (...params: ParamsType<ReducerDef>) => Promise<void> {
	if (!browser) {
		return () => {
			throw new Error('Cannot call a SpacetimeDB reducer during SSR');
		};
	}
	const instance = getConnection();
	const name = def.accessorName;

	type Params = ParamsType<ReducerDef>;

	const queue: Array<{
		params: Params;
		resolve: () => void;
		reject: (err: unknown) => void;
	}> = [];

	$effect(() => {
		const connection = instance.connection;
		if (!connection) return;
		if (!queue.length) return;

		const fn = connection.reducers[name] as (...p: Params) => Promise<void>;

		const pending = queue.splice(0);
		for (const item of pending) {
			fn(...item.params).then(item.resolve, item.reject);
		}
	});

	return (...params: Params) => {
		const connection = instance.connection;
		if (!connection) {
			return new Promise<void>((resolve, reject) => {
				queue.push({ params, resolve, reject });
			});
		}
		const fn = connection.reducers[name] as (...p: Params) => Promise<void>;

		return fn(...params);
	};
}
