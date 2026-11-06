import {
	ConnectionId,
	DbConnectionImpl,
	Identity,
	type DbConnectionBuilder,
	type DbConnectionConfig,
} from 'spacetimedb';
import { connection_cache } from './cache.svelte';
import { getContext, setContext } from 'svelte';

export type UntypedBuilder = DbConnectionBuilder<UntypedDbConnection>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UntypedDbConnection = DbConnectionImpl<any>;

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
	$effect(() => {
		const builder =
			typeof connectionBuilder === 'function' ? connectionBuilder() : connectionBuilder;
		const config = probe_builder(builder);

		const entry = connection_cache.ref(builder, config, instance);

		return () => connection_cache.deref(entry, instance);
	});
	setContext(context_key, instance);
	return instance as ConnectionState_<DbConnection>;
}

export function getConnection<DbConnection extends UntypedDbConnection>() {
	return getContext<ConnectionState_<DbConnection>>(context_key);
}
