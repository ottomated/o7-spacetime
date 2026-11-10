<script lang="ts">
	import '../app.css';
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

<button
	data-testid="toggle-db"
	onclick={() => (database_name = database_name === 'test' ? 'test2' : 'test')}
>
	toggle db
</button>
<button data-testid="set-bad-token" onclick={() => (token = 'test')}>set bad token</button>

{@render children()}
