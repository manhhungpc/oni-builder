export interface ApiResponse<T> {
	success: boolean;
	data: T;
}

export interface PaginatedResponse<T> {
	success: boolean;
	data: T[];
	pagination: Pagination;
}

export interface Pagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}
