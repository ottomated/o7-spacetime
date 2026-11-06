import { schema, table, t } from 'spacetimedb/server';

const spacetimedb = schema({
	person: table(
		{ public: true },
		{
			id: t.u64().primaryKey().autoInc(),
			name: t.string(),
		},
	),
});
export default spacetimedb;

export const add = spacetimedb.reducer({ name: t.string() }, (ctx, { name }) => {
	ctx.db.person.insert({ id: 0n, name });
});

export const remove = spacetimedb.reducer({ id: t.u64() }, (ctx, { id }) => {
	ctx.db.person.id.delete(id);
});
export const update = spacetimedb.reducer(
	{ id: t.u64(), name: t.string() },
	(ctx, { id, name }) => {
		ctx.db.person.id.update({ id, name });
	},
);

export const sayHello = spacetimedb.reducer((ctx) => {
	for (const person of ctx.db.person.iter()) {
		console.info(`Hello, ${person.name}!`);
	}
	console.info('Hello, World!');
});
