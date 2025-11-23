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

/**
 * Get the Parquet file URL for episodes
 * Falls back to production URL if environment variable is not set
 */
function getEpisodesURL(): string {
	return import.meta.env.VITE_EPISODES_PARQUET_URL || 'https://myagues.github.io/seriesheat-duckdb-wasm/episodes.parquet';
}

/**
 * Get the Parquet file URL for series
 * Falls back to production URL if environment variable is not set
 */
function getSeriesURL(): string {
	return import.meta.env.VITE_SERIES_PARQUET_URL || 'https://myagues.github.io/seriesheat-duckdb-wasm/series.parquet';
}

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

	// Register file URLs from environment variables or use production defaults
	await db.registerFileURL(
		'episodes.parquet',
		getEpisodesURL(),
		duckdb.DuckDBDataProtocol.HTTP,
		false
	);

	await db.registerFileURL(
		'series.parquet',
		getSeriesURL(),
		duckdb.DuckDBDataProtocol.HTTP,
		false
	);

	return db;
};
