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
	// Exhaustive types
	types: table(
		{ public: true },
		{
			u8: t.u8(),
			i8: t.i8(),
			u16: t.u16(),
			i16: t.i16(),
			u32: t.u32(),
			i32: t.i32(),
			u64: t.u64(),
			i64: t.i64(),
			u128: t.u128(),
			i128: t.i128(),
			u256: t.u256(),
			i256: t.i256(),
			string: t.string(),
			bool: t.bool(),
			byteArray: t.byteArray(),
			array: t.array(t.string()),
			connectionId: t.connectionId(),
			enum: t.enum('Enum', { a: t.u8(), b: t.i8() }),
			identity: t.identity(),
			object: t.object('Object', {
				a: t.string(),
			}),
			timestamp: t.timestamp(),
			duration: t.timeDuration(),
			uuid: t.uuid(),
			unit: t.unit(),
			scheduleAt: t.scheduleAt(),
		},
	),
});
export default spacetimedb;

export const init = spacetimedb.init((ctx) => {
	ctx.db.types.insert({
		u8: 1,
		i8: -1,
		u16: 2,
		i16: -2,
		u32: 3,
		i32: -3,
	});
});

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
