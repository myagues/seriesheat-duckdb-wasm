<script lang="ts">
	import { initDB } from '$lib/duckdb';
	import { onMount } from 'svelte';
	import { scalePow } from 'd3-scale';
	import { interpolatePiYG } from 'd3-scale-chromatic';
	import { hcl } from 'd3-color';
	import Select from 'svelte-select';
	import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';

	type SeriesRatings = {
		seasonNumber: number;
		episodeNumber: number;
		episodeTitle: string;
		episodeID: string;
		averageRating: number;
	};
	type AxesRange = {
		rangeSeason: number[];
		rangeEpisode: number[];
		episodePad: number;
	};

	let con: Promise<AsyncDuckDBConnection> = new Promise(() => {});
	let ratings: undefined | Promise<SeriesRatings[]> = undefined;
	let axesLabel: AxesRange = { rangeSeason: [0], rangeEpisode: [0], episodePad: 0 };
	let hoverSeason: undefined | number = undefined;
	let hoverEpisode: undefined | number = undefined;
	let fillColor: undefined | string = undefined;
	const colorScale = scalePow().exponent(1.5).domain([0, 10]);
	const range = (start: number, stop: number, step: number = 1) =>
		Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);

	onMount(async () => {
		const db = await initDB();
		con = db.connect();
		// load list of series from Parquet file as a temp table
		await con.then((con) =>
			con.query(`
			create temp table if not exists 'series_map' as (
				select
					seriesID,
					seriesTitle,
					min(startYear) as 'beginYear',
					coalesce(sum(numVotes), 0) as totalVotes
				from 'imdb.parquet'
				where startYear is not null
				group by seriesID, seriesTitle
				order by totalVotes desc
			)
		`)
		);
	});

	async function findSeries(filterText: string) {
		// select-search content is matched against the temp table
		const res = await con.then((con) =>
			con.query(`
			select
				seriesID as 'value',
				concat(seriesTitle, ' (', beginYear, ')') as 'label'
			from 'series_map'
			where regexp_matches(seriesTitle, '${filterText}', 'i')
			limit 30
		`)
		);
		return JSON.parse(JSON.stringify(res.toArray()));
	}

	async function handleSelect(event: { detail: { value: string } }) {
		ratings = new Promise(() => {});
		// get list of episodes and details for the selected series
		const res = await con.then((con) =>
			con.query(`
			select
				seasonNumber,
				episodeNumber,
				episodeTitle,
				episodeID,
				averageRating
			from 'imdb.parquet'
			where seriesID = '${event.detail.value}' and seasonNumber > 0
			order by seasonNumber, episodeNumber
		`)
		);
		// compute label ranges
		const episodeMin = Math.min(...res.getChild('episodeNumber')?.toArray());
		const episodeMax = Math.max(...res.getChild('episodeNumber')?.toArray());
		axesLabel = {
			rangeSeason: [...new Set([...res.getChild('seasonNumber')?.toArray()])],
			rangeEpisode: range(episodeMin, episodeMax),
			episodePad: episodeMin == 0 ? 1 : 0
		};

		ratings = JSON.parse(JSON.stringify(res.toArray()));
		// console.log(ratings);
		return;
	}

	function ratingColor(rating: null | number) {
		return rating == null ? '#ddd' : interpolatePiYG(colorScale(rating));
	}
</script>

<div class="px-4 sm:px-6 md:px-8 font-sans">
	<div class="flex flex-col">
		<div class="max-w-2xl mx-auto mt-10 mb-5">
			<h1 class="font-semibold text-3xl">
				<abbr title="Original name and project by Jim Vallandingham" style:cursor="context-menu"> SeriesHeat </abbr> with
				DuckDB-Wasm
			</h1>
		</div>
		<div class="max-w-prose mx-auto my-5">
			<p>
				This project is a replica of
				<a
					class="desc-link"
					title="SeriesHeat by Jim Vallandingham"
					href="https://vallandingham.me/seriesheat"
					target="_blank">SeriesHeat</a
				>
				by
				<a class="desc-link" title="Jim Vallandingham homepage" href="https://vallandingham.me" target="_blank"
					>Jim Vallandingham</a
				>, that uses
				<a
					class="desc-link"
					title="DuckDB-Wasm blog post"
					href="https://duckdb.org/2021/10/29/duckdb-wasm.html"
					target="_blank">DuckDB-Wasm</a
				>
				instead of
				<a class="desc-link" title="phiresky's blog" href="https://phiresky.github.io/blog" target="_blank">phiresky</a
				>'s
				<a class="desc-link" title="sql.js-httpvfs" href="https://github.com/phiresky/sql.js-httpvfs" target="_blank"
					>sql.js-httpvfs</a
				>.
			</p>
			<p class="my-5">
				Data comes from <a
					class="desc-link"
					title="IMDb Datasets"
					href="https://www.imdb.com/interfaces"
					target="_blank">IMDb Datasets</a
				>
				filtered and preprocessed to Parquet files so they can be directly queried. Code for building said files can be found
				in
				<a class="desc-link" href="https://github.com/myagues/datasets/tree/main/imdb" target="_blank"
					>@myagues/datasets/imdb</a
				>, and code for the project is available
				<a class="desc-link" href="https://github.com/myagues/seriesheat-duckdb-wasm" target="_blank"
					>@myagues/seriesheat-duckdb-wasm
				</a>.
			</p>
		</div>
		{#await con}
			<div class="flex items-center gap-2 text-gray-500 mx-auto pt-10">
				<span class="h-7 w-7 block rounded-full border-4 border-t-green-500 animate-spin mr-2" />
				Loading database...
			</div>
		{:then con}
			<div class="container max-w-2xl mx-auto">
				<Select
					placeholder="Search TV Series title (regular expressions allowed)"
					loadOptions={findSeries}
					on:select={handleSelect}
					on:clear={() => (ratings = undefined)}
				/>
			</div>
		{/await}
		{#await ratings}
			<div class="flex items-center gap-2 text-gray-500 mx-auto pt-10">
				<span class="h-7 w-7 block rounded-full border-4 border-t-green-500 animate-spin mr-2" />
				Loading viz...
			</div>
		{:then ratings}
			{#if ratings && axesLabel}
				<div class="mx-auto p-8">
					<svg width={40 * (axesLabel.rangeSeason.length + 2)} height={40 * (axesLabel.rangeEpisode.length + 2)}>
						<g transform="translate(20, 20)">
							<text class="text-xl font-semibold translate-x-1/2 -translate-y-3">Season</text>
							<text class="text-xl font-semibold -rotate-90 -translate-x-3 translate-y-1/2 ">Episode</text>
							{#each axesLabel.rangeSeason as season}
								<g transform="translate({40 * season}, 0)">
									<text x="19.5" y="19.5" style:font-weight={hoverSeason == season ? 700 : 400}>{season}</text>
								</g>
							{/each}
							<!-- x axis -->
							{#each axesLabel.rangeEpisode as episode}
								<g transform="translate(0, {40 * (episode + axesLabel.episodePad)})">
									<text x="19.5" y="19.5" style:font-weight={hoverEpisode == episode ? 700 : 400}>{episode}</text>
								</g>
							{/each}
							<!-- data -->
							{#each ratings as rating (rating.episodeID)}
								<a title={rating.episodeTitle} href="https://www.imdb.com/title/{rating.episodeID}" target="_blank">
									<g
										on:mousemove={() => (hoverSeason = rating.seasonNumber)}
										on:mousemove={() => (hoverEpisode = rating.episodeNumber)}
										on:mouseleave={() => (hoverSeason = undefined)}
										on:mouseleave={() => (hoverEpisode = undefined)}
										style:cursor="pointer"
										transform="translate({40 * rating.seasonNumber}, {40 *
											(rating.episodeNumber + axesLabel.episodePad)})"
									>
										<rect width="39" height="39" fill={(fillColor = ratingColor(rating.averageRating))} />
										<text
											x="19.5"
											y="19.5"
											class="text-sm tabular-nums"
											fill={hcl(fillColor).l > 70 ? 'black' : 'white'}
										>
											{rating.averageRating == null ? '-' : rating.averageRating.toFixed(1)}
										</text>
									</g>
								</a>
							{/each}
						</g>
					</svg>
				</div>
			{/if}
		{/await}
	</div>
</div>

<style>
	text {
		dominant-baseline: central;
		text-anchor: middle;
	}
	.desc-link {
		text-decoration-line: underline;
		text-decoration-color: #4ade80;
		text-decoration-thickness: 2px;
	}
</style>
