/* eslint-disable svelte/prefer-svelte-reactivity */
import { tick } from 'svelte';
import { ConnectionState } from './provider.svelte';
import type { DbConnectionConfig, Identity } from 'spacetimedb';
import type { UntypedDbConnection, UntypedBuilder } from './types';

type CacheEntry = {
	key: string;
	connection: UntypedDbConnection;
	refs: Set<ConnectionState<UntypedDbConnection>>;
	connected: boolean;
	identity: Identity | null;
	token: string | null;
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
			const new_entry: CacheEntry = {
				key,
				refs,
				connection: undefined as never,
				connected: false,
				identity: null,
				token: null,
			};
			builder.onConnect((connection, identity, token) => {
				new_entry.connected = true;
				new_entry.identity = identity;
				new_entry.token = token;
				for (const state of refs) {
					state.connect(connection, identity, token);
				}
			});
			builder.onConnectError((_, error) => {
				new_entry.connected = false;
				for (const state of refs) {
					state.connect_error(error);
				}
			});
			builder.onDisconnect((_, error) => {
				new_entry.connected = false;
				for (const state of refs) {
					state.disconnect(error);
				}
			});
			if (!config.automaticReconnect) {
				builder = builder.withAutomaticReconnect();
			}
			new_entry.connection = builder.build();
			this.map.set(key, new_entry);
			entry = new_entry;
		}
		entry.refs.add(instance);
		// A consumer joining an entry that is already connected never receives
		// an `onConnect` event, so sync its state from the entry instead.
		if (entry.connected) {
			instance.connect(entry.connection, entry.identity!, entry.token!);
		}
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
