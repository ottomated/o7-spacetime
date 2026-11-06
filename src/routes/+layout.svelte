<script lang="ts">
	import { createSpacetime } from '#lib/index.ts';
	import { DbConnection } from '#lib/spacetime-bindings/index.ts';

	let { children } = $props();

	let database_name = $state('test');
	let token = $state<string>();

	createSpacetime(() =>
		DbConnection.builder()
			.withUri('http://localhost:3000')
			.withDatabaseName(database_name)
			.withToken(token),
	);
</script>

<button onclick={() => (database_name = database_name === 'test' ? 'test2' : 'test')}
	>set url</button
>
<button onclick={() => (token = 'test')}>set token</button>
{@render children()}
