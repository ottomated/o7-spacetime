/* eslint-disable svelte/prefer-svelte-reactivity */
import { tick } from 'svelte';
import { ConnectionState, type UntypedBuilder, type UntypedDbConnection } from './provider.svelte';
import type { DbConnectionConfig } from 'spacetimedb';

type CacheEntry = {
	key: string;
	connection: UntypedDbConnection;
	refs: Set<ConnectionState<UntypedDbConnection>>;
};

export class CacheController {
	map = new Map<string, CacheEntry>();

	ref(
		builder: UntypedBuilder,
		config: DbConnectionConfig<never>,
		instance: ConnectionState<UntypedDbConnection>,
	) {
		const key = `${builder.getUri()}::${builder.getModuleName()}::${config.token}`;
		let entry = this.map.get(key);
		if (!entry) {
			const refs = new Set<ConnectionState<UntypedDbConnection>>();
			entry = {
				key,
				refs,
				connection: undefined as never,
			};
			builder.onConnect((connection, identity, token) => {
				for (const state of refs) {
					state.connect(connection, identity, token);
				}
			});
			builder.onConnectError((_, error) => {
				for (const state of refs) {
					state.connect_error(error);
				}
			});
			builder.onDisconnect((_, error) => {
				for (const state of refs) {
					state.disconnect(error);
				}
			});
			entry.connection = builder.build();
			this.map.set(key, entry);
		}
		entry.refs.add(instance);
		return entry;
	}

	deref(entry: CacheEntry, instance: ConnectionState<UntypedDbConnection>) {
		const key = entry.key;
		entry.refs.delete(instance);
		void tick().then(() => {
			const entry = this.map.get(key);
			if (!entry || entry.refs.size > 0) return;
			entry.connection.disconnect();
			this.map.delete(key);
		});
	}
}

export const connection_cache = new CacheController();
