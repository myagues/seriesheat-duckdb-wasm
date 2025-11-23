<script lang="ts">
	import { ratingColor, getContrastTextColor, createColorScale } from '$lib/services/colorService';
	import type { SeriesRatings, AxesRange } from '$lib/types';

	export let ratings: SeriesRatings[] | undefined;
	export let axesLabel: AxesRange;
	export let flip: boolean;
	export let svgWidth: number;
	export let hoverSeason: undefined | number;
	export let hoverEpisode: undefined | number;

	const rectSize = 40;
	const colorScale = createColorScale();

	$: episodeWidth = rectSize * (2 + axesLabel.rangeEpisode.length);
	$: seasonWidth = rectSize * (2 + axesLabel.rangeSeason.length);

	function handleMouseMove(season: number, episode: number) {
		hoverSeason = season;
		hoverEpisode = episode;
	}

	function handleMouseLeave() {
		hoverSeason = undefined;
		hoverEpisode = undefined;
	}
</script>

{#if ratings && axesLabel}
	<div class="mx-auto p-8">
		<svg
			role="graphics-document document"
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
				<text class="translate-y-1/2 -translate-x-3 -rotate-90 text-xl font-semibold"
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
							style:font-weight={hoverSeason == season ? 700 : 400}>{season}</text
						>
					</g>
				{/each}
				<!-- y axis -->
				{#each axesLabel.rangeEpisode as episode}
					<g
						transform={flip
							? `translate(${rectSize * (episode + axesLabel.episodePad)}, 0)`
							: `translate(0, ${rectSize * (episode + axesLabel.episodePad)})`}
					>
						<text
							x={(rectSize - 1) / 2}
							y={(rectSize - 1) / 2}
							style:font-weight={hoverEpisode == episode ? 700 : 400}>{episode}</text
						>
					</g>
				{/each}
				<!-- data -->
				{#each ratings as rating (rating.episodeID)}
					{@const fillColor = ratingColor(rating.averageRating, colorScale)}
					<a
						title={rating.episodeTitle}
						href="https://www.imdb.com/title/{rating.episodeID}"
						target="_blank"
						rel="noreferrer"
					>
						<g
							role="graphics-object"
							on:mousemove={() => handleMouseMove(rating.seasonNumber, rating.episodeNumber)}
							on:mouseleave={handleMouseLeave}
							style:cursor="pointer"
							transform={flip
								? `translate(${
										rectSize * (rating.episodeNumber + axesLabel.episodePad)
									}, ${rectSize * rating.seasonNumber})`
								: `translate(${rectSize * rating.seasonNumber}, ${
										rectSize * (rating.episodeNumber + axesLabel.episodePad)
									})`}
						>
							<rect
								width={rectSize - 1}
								height={rectSize - 1}
								fill={fillColor}
							/>
							<text
								x={(rectSize - 1) / 2}
								y={(rectSize - 1) / 2}
								class="text-base tabular-nums"
								fill={getContrastTextColor(fillColor)}
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

<style>
	text {
		dominant-baseline: central;
		text-anchor: middle;
	}
</style>
