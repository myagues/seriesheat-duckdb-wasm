# SeriesHeat with DuckDB-Wasm

This project is a replica of [SeriesHeat](https://vallandingham.me/seriesheat) by [Jim Vallandingham](https://vallandingham.me), that uses [DuckDB-Wasm](https://duckdb.org/2021/10/29/duckdb-wasm.html) instead of [phiresky](https://phiresky.github.io/blog)'s [sql.js-httpvfs](https://github.com/phiresky/sql.js-httpvfs).

Data comes from [IMDb Datasets](https://www.imdb.com/interfaces) filtered and preprocessed to Parquet files so they can be directly queried. Code for building said files can be found in [@myagues/datasets/imdb](https://github.com/myagues/datasets/tree/main/imdb), and code for the project is available [@myagues/seriesheat-duckdb-wasm](https://github.com/myagues/seriesheat-duckdb-wasm).

## References

- _SeriesHeat_ [[1]](https://vallandingham.me/seriesheat) [[2]](https://twitter.com/vlandham/status/1445406386968571904)
- [_Plot: Cell_](https://observablehq.com/@observablehq/plot-cell#cell-16) by [Mike Bostock](https://bost.ocks.org/mike)
- [_SeriesHeat Cheap Replica_](https://observablehq.com/@myagues/seriesheat-cheap-replica) using just Observable's Plot API
- [_Making visualizations literally w/ Svelte & D3_](https://www.connorrothschild.com/post/svelte-and-d3) by [Connor Rothschild](https://github.com/connorrothschild)
- [_Plot: colorContrast transform_](https://observablehq.com/@observablehq/plot-colorcontrast-custom-transform) by [Philippe Riviere](https://github.com/Fil) and [Anna Wiederkehr](http://annawiederkehr.com)
- [_sveltekit-typescript_](https://github.com/duckdb-wasm-examples/sveltekit-typescript) is a basic demo of DuckDB-Wasm with SvelteKit by [Benjamin Schmidt](https://benschmidt.org)
