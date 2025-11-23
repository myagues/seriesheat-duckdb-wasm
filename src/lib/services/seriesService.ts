import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type { SeriesRatings, SeriesOption } from '../types';

/**
 * Search for TV series by title using regex pattern
 * @param con DuckDB connection
 * @param filterText Search text (supports regex patterns)
 * @returns Array of series options
 */
export async function findSeries(
	con: AsyncDuckDBConnection,
	filterText: string
): Promise<SeriesOption[]> {
	try {
		// Escape single quotes for SQL safety
		const escapedFilter = filterText.replace(/'/g, "''");

		const res = await con.query(`
			SELECT
				seriesID as value,
				CONCAT(seriesTitle, ' (', beginYear, ')') as label
			FROM parquet_scan('series.parquet')
			WHERE regexp_matches(seriesTitle, '${escapedFilter}', 'i')
			ORDER BY totalVotes DESC
			LIMIT 30
		`);

		return JSON.parse(JSON.stringify(res.toArray()));
	} catch (error) {
		console.error('Error searching for series:', error);
		throw new Error('Failed to search for series');
	}
}

/**
 * Fetch episodes and ratings for a specific series
 * @param con DuckDB connection
 * @param seriesID IMDb series ID
 * @returns Array of episode ratings
 */
export async function fetchSeriesEpisodes(
	con: AsyncDuckDBConnection,
	seriesID: string
): Promise<SeriesRatings[]> {
	try {
		// Use properly escaped query to prevent SQL injection
		const escapedSeriesID = seriesID.replace(/'/g, "''");

		const res = await con.query(`
			SELECT
				seasonNumber,
				episodeNumber,
				episodeTitle,
				episodeID,
				averageRating
			FROM parquet_scan('episodes.parquet')
			WHERE seriesID = '${escapedSeriesID}' AND seasonNumber > 0
			ORDER BY seasonNumber, episodeNumber
		`);

		return JSON.parse(JSON.stringify(res.toArray()));
	} catch (error) {
		console.error('Error fetching episodes:', error);
		throw new Error('Failed to fetch episodes for the selected series');
	}
}

/**
 * Compute axis ranges from episode data
 * @param seasonNumbers Array of season numbers
 * @param episodeNumbers Array of episode numbers
 * @returns Axis range configuration
 */
export function computeAxesRange(seasonNumbers: number[], episodeNumbers: number[]) {
	const seasonMin = Math.min(...seasonNumbers);
	const seasonMax = Math.max(...seasonNumbers);
	const episodeMin = Math.min(...episodeNumbers);
	const episodeMax = Math.max(...episodeNumbers);

	return {
		rangeSeason: range(seasonMin, seasonMax),
		rangeEpisode: range(episodeMin, episodeMax),
		episodePad: episodeMin === 0 ? 1 : 0
	};
}

/**
 * Generate an array of numbers in a range
 * @param start Start value
 * @param stop End value (inclusive)
 * @param step Step size (default 1)
 * @returns Array of numbers
 */
export function range(start: number, stop: number, step: number = 1): number[] {
	return Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);
}
