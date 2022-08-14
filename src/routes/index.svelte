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
	let ratings: undefined | Promise<SeriesRatings[]>;
	let axesLabel: AxesRange = {
		rangeSeason: [0],
		rangeEpisode: [0],
		episodePad: 0
	};
	let hoverSeason: undefined | number;
	let hoverEpisode: undefined | number;
	let fillColor: undefined | string;
	let flip: boolean = false;
	let svgWidth: number;
	$: episodeWidth = rectSize * (2 + axesLabel.rangeEpisode.length);
	$: seasonWidth = rectSize * (2 + axesLabel.rangeSeason.length);
	const rectSize = 40;
	const colorScale = scalePow().exponent(1.5).domain([0, 10]);
	const range = (start: number, stop: number, step: number = 1) =>
		Array.from(
			{ length: (stop - start) / step + 1 },
			(_, i) => start + i * step
		);

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
				from parquet_scan('imdb.parquet')
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
			where regexp_matches(seriesTitle, '${filterText.replace("'", "''")}', 'i')
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
			from parquet_scan('imdb.parquet')
			where seriesID = '${event.detail.value}' and seasonNumber > 0
			order by seasonNumber, episodeNumber
		`)
		);
		// compute label ranges
		const seasonMin = Math.min(...res.getChild('seasonNumber')?.toArray());
		const seasonMax = Math.max(...res.getChild('seasonNumber')?.toArray());
		const episodeMin = Math.min(...res.getChild('episodeNumber')?.toArray());
		const episodeMax = Math.max(...res.getChild('episodeNumber')?.toArray());
		axesLabel = {
			// rangeSeason: [...new Set([...res.getChild('seasonNumber')?.toArray()])],
			rangeSeason: range(seasonMin, seasonMax),
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

<svelte:window bind:innerWidth={svgWidth} />

<div class="px-4 font-sans sm:px-6 md:px-8">
	<div class="flex flex-col">
		<div class="mx-auto mt-10 mb-5 max-w-2xl">
			<h1 class="text-3xl font-semibold">
				<abbr
					title="Original name and project by Jim Vallandingham"
					style:cursor="context-menu"
				>
					SeriesHeat
				</abbr> with DuckDB-Wasm
			</h1>
		</div>
		<div class="mx-auto my-5 max-w-prose">
			<p>
				This project is a replica of
				<a
					class="desc-link"
					title="SeriesHeat by Jim Vallandingham"
					href="https://vallandingham.me/seriesheat"
					target="_blank">SeriesHeat</a
				>
				by
				<a
					class="desc-link"
					title="Jim Vallandingham homepage"
					href="https://vallandingham.me"
					target="_blank">Jim Vallandingham</a
				>, that uses
				<a
					class="desc-link"
					title="DuckDB-Wasm blog post"
					href="https://duckdb.org/2021/10/29/duckdb-wasm.html"
					target="_blank">DuckDB-Wasm</a
				>
				instead of
				<a
					class="desc-link"
					title="phiresky's blog"
					href="https://phiresky.github.io/blog"
					target="_blank">phiresky</a
				>'s
				<a
					class="desc-link"
					title="sql.js-httpvfs"
					href="https://github.com/phiresky/sql.js-httpvfs"
					target="_blank">sql.js-httpvfs</a
				>.
			</p>
			<p class="my-5">
				Data comes from <a
					class="desc-link"
					title="IMDb Datasets"
					href="https://www.imdb.com/interfaces"
					target="_blank">IMDb Datasets</a
				>
				filtered and preprocessed to Parquet files so they can be directly queried.
				Code for building said files can be found in
				<a
					class="desc-link"
					href="https://github.com/myagues/datasets/tree/main/imdb"
					target="_blank">@myagues/datasets/imdb</a
				>, and code for the project is available
				<a
					class="desc-link"
					href="https://github.com/myagues/seriesheat-duckdb-wasm"
					target="_blank"
					>@myagues/seriesheat-duckdb-wasm
				</a>.
			</p>
		</div>
		{#await con}
			<div class="mx-auto flex items-center gap-2 p-5 pt-10 text-gray-500">
				<span
					class="mr-2 block h-7 w-7 animate-spin rounded-full border-4 border-t-green-500"
				/>
				Loading database...
			</div>
		{:then con}
			<div
				class="mx-auto flex max-w-2xl w-full flex-row justify-between items-center gap-2"
			>
				<div class="basis-10/12 shrink">
					<Select
						placeholder="Search TV Series title (regular expressions allowed)"
						loadOptions={findSeries}
						on:select={handleSelect}
						on:clear={() => (ratings = undefined)}
					/>
				</div>
				<div class="flex-none">
					<label
						for="flip-toggle"
						class="relative inline-flex cursor-pointer items-center"
					>
						<input
							type="checkbox"
							bind:checked={flip}
							id="flip-toggle"
							class="peer sr-only"
						/>
						<div
							class="peer h-6 w-11 rounded-full bg-gray-300 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white"
						/>
						<span
							class="ml-3 text-base font-semibold text-gray-900 dark:text-gray-300"
							>Flip</span
						>
					</label>
				</div>
			</div>
		{/await}
		{#await ratings}
			<div class="mx-auto flex items-center gap-2 pt-10 text-gray-500">
				<span
					class="mr-2 block h-7 w-7 animate-spin rounded-full border-4 border-t-green-500"
				/>
				Loading...
			</div>
		{:then ratings}
			{#if ratings && axesLabel}
				<div class="mx-auto p-8">
					<svg
						width={flip
							? Math.min(episodeWidth, svgWidth * 0.75)
							: Math.min(seasonWidth, svgWidth * 0.75)}
						height="100%"
						viewBox={flip
							? `0 0 ${episodeWidth} ${seasonWidth}`
							: `0 0 ${seasonWidth} ${episodeWidth}`}
					>
						<g transform="translate(20, 20)">
							<!-- x axis label -->
							<text class="translate-x-1/2 -translate-y-3 text-xl font-semibold"
								>{flip ? 'Episode' : 'Season'}</text
							>
							<!-- y axis label -->
							<text
								class="translate-y-1/2 -translate-x-3 -rotate-90 text-xl font-semibold"
								>{flip ? 'Season' : 'Episode'}</text
							>
							<!-- x axis -->
							{#each axesLabel.rangeSeason as season}
								<g
									transform={flip
										? `translate(0, ${rectSize * season})`
										: `translate(${rectSize * season}, 0)`}
								>
									<text
										x={(rectSize - 1) / 2}
										y={(rectSize - 1) / 2}
										style:font-weight={hoverSeason == season ? 700 : 400}
										>{season}</text
									>
								</g>
							{/each}
							<!-- y axis -->
							{#each axesLabel.rangeEpisode as episode}
								<g
									transform={flip
										? `translate(${
												rectSize * (episode + axesLabel.episodePad)
										  }, 0)`
										: `translate(0, ${
												rectSize * (episode + axesLabel.episodePad)
										  })`}
								>
									<text
										x={(rectSize - 1) / 2}
										y={(rectSize - 1) / 2}
										style:font-weight={hoverEpisode == episode ? 700 : 400}
										>{episode}</text
									>
								</g>
							{/each}
							<!-- data -->
							{#each ratings as rating (rating.episodeID)}
								<a
									title={rating.episodeTitle}
									href="https://www.imdb.com/title/{rating.episodeID}"
									target="_blank"
								>
									<g
										on:mousemove={() => (hoverSeason = rating.seasonNumber)}
										on:mousemove={() => (hoverEpisode = rating.episodeNumber)}
										on:mouseleave={() => (hoverSeason = undefined)}
										on:mouseleave={() => (hoverEpisode = undefined)}
										style:cursor="pointer"
										transform={flip
											? `translate(${
													rectSize *
													(rating.episodeNumber + axesLabel.episodePad)
											  }, ${rectSize * rating.seasonNumber})`
											: `translate(${rectSize * rating.seasonNumber}, ${
													rectSize *
													(rating.episodeNumber + axesLabel.episodePad)
											  })`}
									>
										<rect
											width={rectSize - 1}
											height={rectSize - 1}
											fill={(fillColor = ratingColor(rating.averageRating))}
										/>
										<text
											x={(rectSize - 1) / 2}
											y={(rectSize - 1) / 2}
											class="text-base tabular-nums"
											fill={hcl(fillColor).l > 70 ? 'black' : 'white'}
										>
											{rating.averageRating == null
												? '-'
												: rating.averageRating.toFixed(1)}
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
		text-decoration-color: #22c55e;
		text-decoration-thickness: 2px;
	}
</style>
