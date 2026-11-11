import { TimeDuration } from 'spacetimedb';
import { schema, table, t } from 'spacetimedb/server';

const spacetimedb = schema({
	person: table(
		{ public: true },
		{
			id: t.u64().primaryKey().autoInc(),
			name: t.string(),
			ide: t.identity(),
			d: t.timeDuration(),
			a: t.byteArray(),
			b: t.object('b', {
				a: t.array(t.i256()),
			}),
		},
	),
	// Test rows without primaryKey
	message: table({ public: true }, { text: t.string() }),
});
export default spacetimedb;

export const add = spacetimedb.reducer({ name: t.string() }, (ctx, { name }) => {
	ctx.db.person.insert({
		id: 0n,
		name,
		ide: ctx.databaseIdentity,
		d: new TimeDuration(123n),
		a: new Uint8Array([1, 2, 3]),
		b: {
			a: [1234n],
		},
	});
});

export const remove = spacetimedb.reducer({ id: t.u64() }, (ctx, { id }) => {
	ctx.db.person.id.delete(id);
});

export const update = spacetimedb.reducer(
	{ id: t.u64(), name: t.string() },
	(ctx, { id, name }) => {
		// ctx.db.person.id.update({ id, name });
	},
);

export const sayHello = spacetimedb.reducer((ctx) => {
	for (const person of ctx.db.person.iter()) {
		// ctx.db.person.id.update({ id: person.id, name: person.name + ' a' });
		console.info(`Hello, ${person.name}!`);
	}
	console.info('Hello, World!');
});

export const clear = spacetimedb.reducer((ctx) => {
	ctx.db.person.clear();
});

export const addMessage = spacetimedb.reducer({ text: t.string() }, (ctx, { text }) => {
	ctx.db.message.insert({ text });
});

export const clearMessages = spacetimedb.reducer((ctx) => {
	ctx.db.message.clear();
});

export const personCount = spacetimedb.procedure(t.u64(), (ctx) =>
	ctx.withTx((tx) => tx.db.person.count()),
);
