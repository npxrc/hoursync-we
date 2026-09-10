export enum Status {
	Accepted,
	Denied,
	Pending,
	Returned,
}
export interface EHourRequest {
	Value: string;
	Description: string;
	Hours: string;
	Date: string;
	State: Status;
}
export interface EHourRequestList {
	Accepted: EHourRequest[];
	Denied: EHourRequest[];
	Pending: EHourRequest[];
	Returned: EHourRequest[];
}
export interface FetchedEHourRequest {
	Value: string;
	Date: string | null;
	Body: string | null;
	RequestedHours: string | null;
	Images: string[];
	Comments: string | null;
	Error?: string;
	Success: boolean;
	LoggedIn: boolean;
	Html: string | null;
}
export interface LeaderboardStudent {
	Name: string;
	Hours: string;
	Rank: number;
}
export interface LeaderboardData {
	Hours: any;
	Rank: any;
	Name: any;
	StudentData: LeaderboardStudent[];
}
