import type { SearchQuery, SearchResult, AutocompleteQuery, AutocompleteResult } from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type SearchApi = {
	query(params: SearchQuery): Promise<SearchResult<unknown>>;
	autocomplete(params: AutocompleteQuery): Promise<AutocompleteResult>;
};

export function createSearchApi(transport: HttpTransport): SearchApi {
	return {
		query: (params) => transport.post("/search", params),
		autocomplete: (params) => transport.post("/search/autocomplete", params),
	};
}
