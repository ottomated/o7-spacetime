import { schema, table, t } from 'spacetimedb/server';

const spacetimedb = schema({
	person: table(
		{ public: true },
		{
			name: t.string(),
		},
	),
});
export default spacetimedb;

export const add = spacetimedb.reducer({ name: t.string() }, (ctx, { name }) => {
	ctx.db.person.insert({ name });
});

export const sayHello = spacetimedb.reducer((ctx) => {
	for (const person of ctx.db.person.iter()) {
		console.info(`Hello, ${person.name}!`);
	}
	console.info('Hello, World!');
});
