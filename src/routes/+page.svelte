<script lang="ts">
	import { getConnection, reducer } from '#lib/index.ts';
	import { reducers, tables } from '#lib/spacetime-bindings/index.ts';
	import { table } from '#lib/table.svelte.ts';
	import Person from './Person.svelte';

	const connection = getConnection();

	let add_name = $state.raw('');
	const add = reducer(reducers.add);
	const say_hello = reducer(reducers.sayHello);

	const people = table(tables.person.where((w) => w.name.eq('a')));
	let mounted = $state(false);
</script>

<p>{connection.state}</p>
<p>{connection.identity}</p>
<p>{connection.connectionId?.toHexString()}</p>
<p>Error: {connection.connectionError?.message}</p>
<p>{connection.token}</p>

<input bind:value={add_name} />
<button onclick={() => add({ name: add_name }).catch(console.error)}>add</button>
<button onclick={() => say_hello()}>say hello</button>

<button onclick={() => (mounted = !mounted)}>Mount</button>
{#if mounted}
	<Person />
{/if}
