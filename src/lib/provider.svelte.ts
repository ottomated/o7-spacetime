import {
	ConnectionId,
	Identity,
	type DbConnectionBuilder,
	type DbConnectionConfig,
} from 'spacetimedb';
import { connection_cache } from './cache.svelte';
import { getContext, setContext } from 'svelte';
import type { UntypedBuilder, UntypedDbConnection } from './types';
import { BROWSER } from 'esm-env';
import { parse_json_row, type SqlResponse } from './ssr';

export type ConnectionState_<DbConnection extends UntypedDbConnection> =
	| {
			readonly state: 'disconnected';
			readonly identity: null;
			readonly connectionId: null;
			readonly connectionError?: Error;
			readonly token?: string;
			readonly connection: null;
	  }
	| {
			readonly state: 'connected';
			readonly identity: Identity;
			readonly connectionId: ConnectionId;
			readonly connectionError?: undefined;
			readonly token?: string;
			readonly connection: DbConnection;
	  };

export class ConnectionState<DbConnection extends UntypedDbConnection> {
	#state = $state.raw<'connected' | 'disconnected'>('disconnected');
	#identity = $state.raw<Identity | null>(null);
	#connection_id = $state.raw<ConnectionId | null>(null);
	#connection_error = $state.raw<Error | undefined>();
	#token = $state.raw<string | undefined>();
	#connection = $state.raw<DbConnection | null>(null);

	get connection() {
		return this.#connection;
	}
	get state() {
		return this.#state;
	}
	get identity() {
		return this.#identity;
	}
	get connectionId() {
		return this.#connection_id;
	}
	get connectionError() {
		return this.#connection_error;
	}
	get token() {
		return this.#token;
	}

	/** @internal */
	connect(connection: DbConnection, identity: Identity, token: string) {
		this.#state = 'connected';
		this.#identity = identity;
		this.#connection_id = connection.connectionId;
		this.#connection_error = undefined;
		this.#token = token;
		this.#connection = connection;
	}

	/** @internal */
	connect_error(error: Error) {
		this.#state = 'disconnected';
		this.#identity = null;
		this.#connection_id = ConnectionId.random();
		this.#connection_error = error;
		this.#connection = null;
	}

	/** @internal */
	disconnect(error: Error | undefined) {
		console.log('disconnect', error);
		this.#state = 'disconnected';
		this.#identity = null;
		this.#connection_id = ConnectionId.random();
		this.#connection_error ??= error;
		this.#connection = null;
	}

	/** @internal */
	config!: DbConnectionConfig<never>;

	/** @internal */
	async ssr_query(sql: string) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const url = new URL(`v1/database/${this.config.nameOrAddress}/sql`, this.config.uri);
		const headers = new Headers();
		if (this.config.token) {
			headers.set('Authorization', `Bearer ${this.config.token}`);
		}
		const res = await fetch(url, {
			method: 'POST',
			headers,
			body: sql,
		});
		if (!res.ok) {
			throw new Error(`SpacetimeDB request failed (${res.status}): ${await res.text()}`);
		}
		const data: SqlResponse = await res.json();

		for (const row of data[0].rows) {
			console.log('a', parse_json_row(row, data[0].schema));
		}

		// console.log(data[0].schema.elements, data[0].rows[0]);
	}
}

function probe_builder(b: UntypedBuilder) {
	const builder = b as unknown as {
		dbConnectionCtor: (config: DbConnectionConfig<never>) => void;
		build: () => void;
	};
	const ctor = builder.dbConnectionCtor;
	let config: DbConnectionConfig<never> | undefined;
	builder.dbConnectionCtor = (c) => {
		config = c;
	};
	builder.build();
	builder.dbConnectionCtor = ctor;
	return config!;
}

const context_key = Symbol('spacetimedb');

export function createSpacetime<DbConnection extends UntypedDbConnection>(
	connectionBuilder: DbConnectionBuilder<DbConnection> | (() => DbConnectionBuilder<DbConnection>),
) {
	const instance = new ConnectionState<DbConnection>();
	if (!BROWSER) {
		const builder =
			typeof connectionBuilder === 'function' ? connectionBuilder() : connectionBuilder;
		instance.config = probe_builder(builder);
	}
	$effect(() => {
		const builder =
			typeof connectionBuilder === 'function' ? connectionBuilder() : connectionBuilder;
		const config = probe_builder(builder);
		instance.config = config;

		const entry = connection_cache.ref(builder, config, instance);

		return () => connection_cache.deref(entry, instance);
	});
	setContext(context_key, instance);
	return instance as ConnectionState_<DbConnection>;
}

export function getConnection<DbConnection extends UntypedDbConnection>(
	function_name = 'getConnection',
) {
	const instance = getContext<ConnectionState_<DbConnection> | undefined>(context_key);
	if (!instance) {
		throw new Error(
			`${function_name} must be used within a component that called createSpacetime. ` +
				'Did you forget to call `createSpacetime` in a parent component?',
		);
	}
	return instance;
}
