import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '/node_modules/@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '/node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_eh from '/node_modules/@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '/node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

import Worker from 'web-worker';
import { assets } from '$app/paths';

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
	mvp: {
		mainModule: duckdb_wasm,
		mainWorker: mvp_worker
	},
	eh: {
		mainModule: duckdb_wasm_eh,
		mainWorker: eh_worker
	}
};

let db: duckdb.AsyncDuckDB | null = null;

export const initDB = async () => {
	if (db) {
		return db;
	}

	// Select a bundle based on browser checks
	const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
	// Instantiate the asynchronus version of DuckDB-wasm
	const worker = new Worker(bundle.mainWorker!);
	const logger = new duckdb.ConsoleLogger();
	db = new duckdb.AsyncDuckDB(logger, worker);
	await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

	await db.registerFileURL(
		'imdb.parquet',
		'https://myagues.github.io/seriesheat-duckdb-wasm/5b48027d187945548497e6b9493c54cd.parquet'
	);

	// const parquet = await fetch(`${assets}/11218b1788f345329a1d4176d886b1da.parquet`).then((d) =>
	// 	d.arrayBuffer()
	// );
	// await db.registerFileBuffer('imdb.parquet', new Uint8Array(parquet));
	return db;
};
