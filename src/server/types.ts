// API response types

export interface ApiResponse<T> {
	data: T
	success: boolean
	error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
	total: number
	page: number
	pageSize: number
}
