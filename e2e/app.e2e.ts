import { expect, test, type Page } from '@playwright/test';

const person_row = (page: Page, name: string) =>
	page.locator(`[data-testid="person-row"][data-name="${name}"]`);

const person_row_by_id = (page: Page, id: string) =>
	page.locator(`[data-testid="person-row"][data-id="${id}"]`);

const filtered_row = (page: Page, name: string) =>
	page.locator(`[data-testid="filtered-row"][data-name="${name}"]`);

/** Adds a person and returns its auto-incremented id. */
async function add_person(page: Page, name: string): Promise<string> {
	await page.getByTestId('name-input').fill(name);
	await page.getByTestId('add-button').click();
	const row = person_row(page, name);
	await expect(row).toBeVisible();
	const id = await row.getByTestId('row-id').innerText();
	expect(id).toMatch(/^\d+$/);
	return id.trim();
}

/** Renames a person and waits for the change to be confirmed by the server. */
async function rename_person(page: Page, id: string, name: string) {
	const row = person_row_by_id(page, id);
	await row.getByTestId('row-name-input').fill(name);
	await row.getByTestId('row-update').click();
	await expect(row).toHaveAttribute('data-name', name);
}

async function delete_person(page: Page, id: string) {
	const row = person_row_by_id(page, id);
	await row.getByTestId('row-delete').click();
	await expect(row).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await expect(page.getByTestId('connection-state')).toHaveText('connected');
	// Wait until all subscriptions are applied, so `clear` can't race the
	// initial snapshots (transactions are ordered, the wait is belt and braces).
	await expect(page.getByTestId('people-active')).toHaveText('true');
	await expect(page.getByTestId('messages-active')).toHaveText('true');
	// Isolate this test from any rows left over by earlier tests or runs.
	await page.getByTestId('clear-button').click();
	await page.getByTestId('clear-messages-button').click();
	await expect(page.getByTestId('person-row')).toHaveCount(0);
	await expect(page.getByTestId('filtered-row')).toHaveCount(0);
	await expect(page.getByTestId('message-row')).toHaveCount(0);
});

test('connects and exposes connection state', async ({ page }) => {
	await expect(page.getByTestId('connection-identity')).not.toHaveText('');
	await expect(page.getByTestId('connection-id')).not.toHaveText('');
	await expect(page.getByTestId('connection-error')).toHaveText('');
	await expect(page.getByTestId('connection-token')).not.toHaveText('');
	await expect(page.getByTestId('people-active')).toHaveText('true');
	await expect(page.getByTestId('filtered-active')).toHaveText('true');
	await expect(page.getByTestId('messages-active')).toHaveText('true');
});

test('adds a person with an auto-incremented id', async ({ page }) => {
	await add_person(page, 'alice');
	// The filtered view only matches rows named exactly "a".
	await expect(filtered_row(page, 'alice')).toHaveCount(0);
});

test('updating a person mutates the row in place', async ({ page }) => {
	const id = await add_person(page, 'carol');
	const row = person_row_by_id(page, id);
	// Tag the DOM node so we can prove the same node survives the update
	// (keyed each + in-place Object.assign), rather than being re-created.
	await row.evaluate((el) => (el.dataset.marker = 'survivor'));

	await rename_person(page, id, 'carol2');

	await expect(person_row(page, 'carol2')).toHaveAttribute('data-marker', 'survivor');
	await expect(person_row(page, 'carol')).toHaveCount(0);
});

test('deleting a person removes the row and keeps the rest consistent', async ({ page }) => {
	const p1 = await add_person(page, 'p1');
	const p2 = await add_person(page, 'p2');
	const p3 = await add_person(page, 'p3');
	await expect(page.getByTestId('person-row')).toHaveCount(3);

	// Delete the middle row.
	await delete_person(page, p2);
	await expect(page.getByTestId('person-row')).toHaveCount(2);

	// The index map must stay consistent: update and delete still work.
	await rename_person(page, p3, 'p3b');
	await delete_person(page, p3);
	await expect(page.getByTestId('person-row')).toHaveCount(1);
	await expect(person_row_by_id(page, p1)).toBeVisible();
});

test('update all modifies every row within a single transaction', async ({ page }) => {
	const x1 = await add_person(page, 'x1');
	const x2 = await add_person(page, 'x2');
	const x3 = await add_person(page, 'x3');

	await page.getByTestId('update-all-button').click();

	// say_hello updates all rows in one transaction: every event must be
	// applied incrementally, none may be dropped.
	await expect(person_row_by_id(page, x1)).toHaveAttribute('data-name', 'x1 a');
	await expect(person_row_by_id(page, x2)).toHaveAttribute('data-name', 'x2 a');
	await expect(person_row_by_id(page, x3)).toHaveAttribute('data-name', 'x3 a');
	await expect(page.getByTestId('person-row')).toHaveCount(3);
});

test('the filtered view follows the where clause as rows change', async ({ page }) => {
	const a = await add_person(page, 'a'); // matches the filter
	const b = await add_person(page, 'b'); // does not match
	await expect(filtered_row(page, 'a')).toBeVisible();
	await expect(filtered_row(page, 'b')).toHaveCount(0);

	// Renaming b -> a enters the filtered view.
	await rename_person(page, b, 'a');
	await expect(page.getByTestId('filtered-row')).toHaveCount(2);

	// Renaming a -> c leaves the filtered view.
	await rename_person(page, a, 'c');
	await expect(page.getByTestId('filtered-row')).toHaveCount(1);
	await expect(filtered_row(page, 'c')).toHaveCount(0);

	// Deleting the remaining row also empties the filtered view.
	await delete_person(page, b);
	await expect(page.getByTestId('filtered-row')).toHaveCount(0);
});

test('existing rows are restored on reload (subscription apply)', async ({ page }) => {
	await add_person(page, 'persisted');
	await page.reload();
	await expect(page.getByTestId('connection-state')).toHaveText('connected');
	await expect(person_row(page, 'persisted')).toBeVisible();
});

test('calling a procedure returns its value', async ({ page }) => {
	await add_person(page, 'one');
	await add_person(page, 'two');
	await page.getByTestId('count-button').click();
	await expect(page.getByTestId('count-output')).toHaveText('2');
});

test('crud loop produces no uncaught page errors', async ({ page }) => {
	const page_errors: string[] = [];
	page.on('pageerror', (error) => page_errors.push(error.message));

	const id = await add_person(page, 'smoke');
	await rename_person(page, id, 'smoke2');
	await delete_person(page, id);

	expect(page_errors).toEqual([]);
});

test('switching to a missing database disconnects with an error', async ({ page }) => {
	await page.getByTestId('toggle-db').click();
	await expect(page.getByTestId('connection-state')).toHaveText('disconnected');
	await expect(page.getByTestId('connection-error')).not.toHaveText('');
	await expect(page.getByTestId('people-active')).toHaveText('false');
	await expect(page.getByTestId('filtered-active')).toHaveText('false');
	await expect(page.getByTestId('person-row')).toHaveCount(0);
});

test('queued calls flush after reconnecting', async ({ page }) => {
	await page.getByTestId('toggle-db').click();
	await expect(page.getByTestId('connection-state')).toHaveText('disconnected');

	// While disconnected the call is queued, not sent.
	await page.getByTestId('name-input').fill('queued');
	await page.getByTestId('add-button').click();

	await page.getByTestId('toggle-db').click();
	await expect(page.getByTestId('connection-state')).toHaveText('connected');
	await expect(page.getByTestId('connection-error')).toHaveText('');
	await expect(page.getByTestId('people-active')).toHaveText('true');
	await expect(person_row(page, 'queued')).toBeVisible();
});

test('the connection cache shares one connection between consumers', async ({ page }) => {
	const layout_id = (await page.getByTestId('connection-id').innerText()).trim();

	// Mounting a second consumer with identical connection parameters must
	// reuse the cached connection instead of opening a second one.
	await page.getByTestId('toggle-probe').click();
	await expect(page.getByTestId('probe-state')).toHaveText('connected');
	await expect(page.getByTestId('probe-connection-id')).toHaveText(layout_id);
});

test('the connection cache refcounts connections between consumers', async ({ page }) => {
	const first_id = (await page.getByTestId('connection-id').innerText()).trim();

	// Mount a second consumer, so the shared connection has two refs.
	await page.getByTestId('toggle-probe').click();
	await expect(page.getByTestId('probe-connection-id')).toHaveText(first_id);

	// The layout drops its ref (switches to a missing database); the probe's
	// remaining ref must keep the shared connection alive.
	await page.getByTestId('toggle-db').click();
	await expect(page.getByTestId('connection-state')).toHaveText('disconnected');
	await expect(page.getByTestId('probe-state')).toHaveText('connected');

	// Once the probe (the last ref) goes away, the connection is torn down,
	// so reconnecting builds a fresh connection with a new id.
	await page.getByTestId('toggle-probe').click();
	await page.getByTestId('toggle-db').click();
	await expect(page.getByTestId('connection-state')).toHaveText('connected');
	await expect(page.getByTestId('connection-id')).not.toHaveText(first_id);
});

test('a table without a primary key matches rows by value', async ({ page }) => {
	await page.getByTestId('message-input').fill('hello');
	await page.getByTestId('add-message-button').click();
	await page.getByTestId('message-input').fill('world');
	await page.getByTestId('add-message-button').click();
	await expect(page.getByTestId('message-row')).toHaveCount(2);

	// The delete callback receives freshly decoded rows, never the stored
	// objects: without a primary key, matching must happen by row value.
	await page.getByTestId('clear-messages-button').click();
	await expect(page.getByTestId('message-row')).toHaveCount(0);
});

test('a bad token fails the connection', async ({ page }) => {
	await page.getByTestId('set-bad-token').click();
	await expect(page.getByTestId('connection-state')).toHaveText('disconnected');
	await expect(page.getByTestId('connection-error')).not.toHaveText('');
	await expect(page.getByTestId('person-row')).toHaveCount(0);
});
