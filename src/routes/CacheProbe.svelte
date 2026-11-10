<script lang="ts">
	import { createSpacetime } from '#lib/index.ts';
	import { DbConnection } from '#lib/spacetime-bindings/index.ts';

	const state = createSpacetime(() =>
		DbConnection.builder().withUri('http://localhost:3000').withDatabaseName('test'),
	);
</script>

<p data-testid="probe-state">{state.state}</p>
<p data-testid="probe-connection-id">{state.connectionId?.toHexString()}</p>
