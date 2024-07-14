import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

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
		'episodes.parquet',
		'https://myagues.github.io/seriesheat-duckdb-wasm/episodes.parquet',
		// 'http://localhost:5173/episodes.parquet',
		duckdb.DuckDBDataProtocol.HTTP,
		false
	);

	await db.registerFileURL(
		'series.parquet',
		'https://myagues.github.io/seriesheat-duckdb-wasm/series.parquet',
		// 'http://localhost:5173/series.parquet',
		duckdb.DuckDBDataProtocol.HTTP,
		false
	);

	return db;
};
