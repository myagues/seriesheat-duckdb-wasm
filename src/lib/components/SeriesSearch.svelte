<script lang="ts">
	import Select from 'svelte-select';
	import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
	import { findSeries } from '$lib/services/seriesService';
	import type { SeriesOption } from '$lib/types';

	export let connection: Promise<AsyncDuckDBConnection>;
	export let isLoading: boolean = false;

	async function handleFindSeries(filterText: string) {
		try {
			const con = await connection;
			return await findSeries(con, filterText);
		} catch (error) {
			console.error('Search error:', error);
			return [];
		}
	}

	function handleSelect(event: { detail: SeriesOption }) {
		// Dispatch custom event for parent to handle
		isLoading = true;
		const customEvent = new CustomEvent('seriesSelected', {
			detail: event.detail
		});
		document.dispatchEvent(customEvent);
	}

	function handleClear() {
		const customEvent = new CustomEvent('seriesCleared');
		document.dispatchEvent(customEvent);
	}
</script>

<Select
	placeholder="Search TV Series title (regular expressions allowed)"
	loadOptions={handleFindSeries}
	on:select={handleSelect}
	on:clear={handleClear}
/>
