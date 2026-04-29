export type RatingTargetType = 'EventType' | 'User' | 'Membership'

export interface RatingSummary {
	avg: number | null
	count: number
	myRating: number | null
}

export interface SetRatingBody {
	value: number
}
