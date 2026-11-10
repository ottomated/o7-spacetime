<script lang="ts">
	import { getConnection, procedure, reducer } from '#lib/index.ts';
	import { procedures, reducers, tables } from '#lib/spacetime-bindings/index.ts';
	import { table } from '#lib/table.svelte.ts';
	import CacheProbe from './CacheProbe.svelte';

	const connection = getConnection();

	let add_name = $state.raw('');
	let message_text = $state.raw('');
	let count_result = $state<string>();
	let cache_probe_mounted = $state(false);

	const add = reducer(reducers.add);
	const remove = reducer(reducers.remove);
	const update = reducer(reducers.update);
	const clear = reducer(reducers.clear);
	const say_hello = reducer(reducers.sayHello);
	const person_count = procedure(procedures.personCount);
	const add_message = reducer(reducers.addMessage);
	const clear_messages = reducer(reducers.clearMessages);

	const people = table(tables.person);
	const people_named_a = table(tables.person.where((w) => w.name.eq('a')));
	const messages = table(tables.message);
</script>

<p data-testid="connection-state">{connection.state}</p>
<p data-testid="connection-identity">{connection.identity}</p>
<p data-testid="connection-id">{connection.connectionId?.toHexString()}</p>
<p data-testid="connection-error">{connection.connectionError?.message}</p>
<p data-testid="connection-token">{connection.token}</p>
<p data-testid="people-active">{people.isActive}</p>
<p data-testid="filtered-active">{people_named_a.isActive}</p>
<p data-testid="messages-active">{messages.isActive}</p>

<div>
	<input data-testid="name-input" bind:value={add_name} />
	<button data-testid="add-button" onclick={() => add({ name: add_name }).catch(console.error)}>
		add
	</button>
	<button data-testid="clear-button" onclick={() => clear().catch(console.error)}>clear</button>
	<button data-testid="update-all-button" onclick={() => say_hello().catch(console.error)}>
		update all
	</button>
	<button
		data-testid="count-button"
		onclick={() =>
			person_count().then(
				(count) => (count_result = count.toString()),
				(error) => (count_result = `error: ${error}`),
			)}
	>
		count
	</button>
	<button data-testid="toggle-probe" onclick={() => (cache_probe_mounted = !cache_probe_mounted)}>
		toggle cache probe
	</button>
	<p data-testid="count-output">{count_result}</p>
</div>

<ul data-testid="people-list">
	{#each people.rows as row (row.id)}
		<li data-testid="person-row" data-id={row.id} data-name={row.name}>
			<span data-testid="row-id">{row.id}</span>
			<input data-testid="row-name-input" bind:value={row.name} />
			<button
				data-testid="row-update"
				onclick={() => update({ id: row.id, name: row.name }).catch(console.error)}
			>
				update
			</button>
			<button data-testid="row-delete" onclick={() => remove({ id: row.id }).catch(console.error)}>
				delete
			</button>
		</li>
	{/each}
</ul>

<ul data-testid="filtered-list">
	{#each people_named_a.rows as row (row.id)}
		<li data-testid="filtered-row" data-id={row.id} data-name={row.name}>
			{row.id}
			{row.name}
		</li>
	{/each}
</ul>

<div>
	<input data-testid="message-input" bind:value={message_text} />
	<button
		data-testid="add-message-button"
		onclick={() => add_message({ text: message_text }).catch(console.error)}
	>
		send message
	</button>
	<button data-testid="clear-messages-button" onclick={() => clear_messages().catch(console.error)}>
		clear messages
	</button>
</div>

<ul data-testid="message-list">
	{#each messages.rows as row (row)}
		<li data-testid="message-row" data-name={row.text}>{row.text}</li>
	{/each}
</ul>

{#if cache_probe_mounted}
	<CacheProbe />
{/if}
