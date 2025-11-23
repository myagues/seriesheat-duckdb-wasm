import { scalePow } from 'd3-scale';
import { interpolatePiYG } from 'd3-scale-chromatic';
import { hcl } from 'd3-color';

/**
 * Create a color scale for ratings (0-10)
 * @returns Configured d3 scale function
 */
export function createColorScale() {
	return scalePow().exponent(1.5).domain([0, 10]);
}

/**
 * Get the color for a given rating
 * @param rating Average rating value (0-10) or null
 * @param colorScale D3 color scale function
 * @returns Hex color code
 */
export function ratingColor(rating: null | number, colorScale: ReturnType<typeof createColorScale>): string {
	return rating == null ? '#ddd' : interpolatePiYG(colorScale(rating));
}

/**
 * Determine text color (black or white) based on background lightness
 * @param backgroundColor Hex color code
 * @returns 'black' or 'white' for optimal contrast
 */
export function getContrastTextColor(backgroundColor: string): string {
	const color = hcl(backgroundColor);
	return color.l > 70 ? 'black' : 'white';
}
