<script lang="ts">
	import { getConnection, reducer } from '#lib/index.ts';
	import { reducers, tables } from '#lib/spacetime-bindings/index.ts';
	import { table } from '#lib/table.svelte.ts';
	import Person from './Person.svelte';

	const connection = getConnection();

	let add_name = $state.raw('');
	const add = reducer(reducers.add);
	const remove = reducer(reducers.remove);
	const update = reducer(reducers.update);
	const say_hello = reducer(reducers.sayHello);

	const people = table(tables.person);
	let mounted = $state(false);
</script>

<p>{connection.state}</p>
<p>{connection.identity}</p>
<p>{connection.connectionId?.toHexString()}</p>
<p>{connection.connectionError?.message}</p>
<p>{connection.token}</p>

<div>
	<input bind:value={add_name} />
	<button onclick={() => add({ name: add_name }).catch(console.error)}>add</button>
</div>
{#each people.rows as row (row.id)}
	{let name = $derived(row.name)}
	<div>
		{row.id}
		{row.name}
		<input bind:value={name} />
		<button onclick={() => update({ id: row.id, name })}>update</button>
		<button onclick={() => remove({ id: row.id })}>delete</button>
	</div>
{/each}
