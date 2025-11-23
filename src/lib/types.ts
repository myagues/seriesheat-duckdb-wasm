export type SeriesRatings = {
	seasonNumber: number;
	episodeNumber: number;
	episodeTitle: string;
	episodeID: string;
	averageRating: number;
};

export type AxesRange = {
	rangeSeason: number[];
	rangeEpisode: number[];
	episodePad: number;
};

export type SeriesOption = {
	value: string;
	label: string;
};
