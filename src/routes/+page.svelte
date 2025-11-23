<script lang="ts">
	import { initDB } from '$lib/duckdb';
	import { onMount } from 'svelte';
	import { fetchSeriesEpisodes, computeAxesRange } from '$lib/services/seriesService';
	import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
	import type { SeriesRatings, AxesRange } from '$lib/types';
	import SeriesSearch from '$lib/components/SeriesSearch.svelte';
	import Visualization from '$lib/components/Visualization.svelte';

	let con: Promise<AsyncDuckDBConnection> = new Promise(() => {});
	let ratings: SeriesRatings[] | undefined;
	// Alias for the connection promise
	$: connection = con;
	let axesLabel: AxesRange = {
		rangeSeason: [0],
		rangeEpisode: [0],
		episodePad: 0
	};
	let hoverSeason: undefined | number;
	let hoverEpisode: undefined | number;
	let flip: boolean = false;
	let svgWidth: number;
	let isLoadingRatings: boolean = false;

	onMount(async () => {
		const db = await initDB();
		con = db.connect();

		// Listen for series selection events
		document.addEventListener('seriesSelected', handleSeriesSelected);
		document.addEventListener('seriesCleared', handleSeriesCleared);
	});

	async function handleSeriesSelected(event: Event) {
		isLoadingRatings = true;
		try {
			const customEvent = event as CustomEvent;
			const seriesID = customEvent.detail.value;
			const connection = await con;

			const fetchedRatings = await fetchSeriesEpisodes(connection, seriesID);

			// Compute label ranges
			if (fetchedRatings.length > 0) {
				const seasonNumbers = fetchedRatings.map((r) => r.seasonNumber);
				const episodeNumbers = fetchedRatings.map((r) => r.episodeNumber);
				axesLabel = computeAxesRange(seasonNumbers, episodeNumbers);
			}

			ratings = fetchedRatings;
		} catch (error) {
			console.error('Failed to load series:', error);
			ratings = undefined;
		} finally {
			isLoadingRatings = false;
		}
	}

	function handleSeriesCleared() {
		ratings = undefined;
		axesLabel = {
			rangeSeason: [0],
			rangeEpisode: [0],
			episodePad: 0
		};
	}
</script>

<svelte:window bind:innerWidth={svgWidth} />

<div class="px-4 font-sans sm:px-6 md:px-8">
	<div class="flex flex-col">
		<div class="mx-auto mt-10 mb-5 max-w-2xl">
			<h1 class="text-3xl font-semibold">
				<abbr title="Original name and project by Jim Vallandingham" style:cursor="context-menu">
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
					target="_blank"
					rel="noreferrer">SeriesHeat</a
				>
				by
				<a
					class="desc-link"
					title="Jim Vallandingham homepage"
					href="https://vallandingham.me"
					target="_blank"
					rel="noreferrer">Jim Vallandingham</a
				>, that uses
				<a
					class="desc-link"
					title="DuckDB-Wasm blog post"
					href="https://duckdb.org/2021/10/29/duckdb-wasm.html"
					target="_blank"
					rel="noreferrer">DuckDB-Wasm</a
				>
				instead of
				<a
					class="desc-link"
					title="phiresky's blog"
					href="https://phiresky.github.io/blog"
					target="_blank"
					rel="noreferrer">phiresky</a
				>'s
				<a
					class="desc-link"
					title="sql.js-httpvfs"
					href="https://github.com/phiresky/sql.js-httpvfs"
					target="_blank"
					rel="noreferrer">sql.js-httpvfs</a
				>.
			</p>
			<p class="my-5">
				Data comes from <a
					class="desc-link"
					title="IMDb Datasets"
					href="https://www.imdb.com/interfaces"
					target="_blank"
					rel="noreferrer">IMDb Datasets</a
				>
				filtered and preprocessed to Parquet files so they can be directly queried. Code for building
				said files can be found in
				<a
					class="desc-link"
					href="https://github.com/myagues/datasets/tree/main/imdb"
					target="_blank"
					rel="noreferrer">@myagues/datasets/imdb</a
				>, and code for the project is available
				<a
					class="desc-link"
					href="https://github.com/myagues/seriesheat-duckdb-wasm"
					target="_blank"
					rel="noreferrer"
					>@myagues/seriesheat-duckdb-wasm
				</a>.
			</p>
		</div>
		{#await con}
			<div class="mx-auto flex items-center gap-2 p-5 pt-10 text-gray-500">
				<span class="mr-2 block h-7 w-7 animate-spin rounded-full border-4 border-t-green-500" />
				Loading database...
			</div>
		{:then con}
			<div class="mx-auto flex max-w-2xl w-full flex-row justify-between items-center gap-2">
				<div class="basis-10/12 shrink">
					<SeriesSearch {connection} bind:isLoading={isLoadingRatings} />
				</div>
				<div class="flex-none">
					<label for="flip-toggle" class="relative inline-flex cursor-pointer items-center">
						<input type="checkbox" bind:checked={flip} id="flip-toggle" class="peer sr-only" />
						<div
							class="peer h-6 w-11 rounded-full bg-gray-300 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white"
						/>
						<span class="ml-3 text-base font-semibold text-gray-900 dark:text-gray-300">Flip</span>
					</label>
				</div>
			</div>
		{/await}
		{#if isLoadingRatings}
			<div class="mx-auto flex items-center gap-2 pt-10 text-gray-500">
				<span class="mr-2 block h-7 w-7 animate-spin rounded-full border-4 border-t-green-500" />
				Loading...
			</div>
		{:else}
			<Visualization
				{ratings}
				{axesLabel}
				{flip}
				{svgWidth}
				{hoverSeason}
				{hoverEpisode}
			/>
		{/if}
	</div>
</div>

<style>
	.desc-link {
		text-decoration-line: underline;
		text-decoration-color: #22c55e;
		text-decoration-thickness: 2px;
	}
</style>
