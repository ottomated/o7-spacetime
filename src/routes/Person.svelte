<script lang="ts">
	import { tables } from '#lib/spacetime-bindings/index.ts';
	import { table } from '#lib/table.svelte.ts';

	const person = table(tables.person);
</script>

<p>Child: {person.rows.map((p) => p.name)}</p>
