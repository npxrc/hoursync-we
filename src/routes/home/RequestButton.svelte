<script lang="ts">
	import { goto } from "$app/navigation";
	import { Status } from "$lib/types";

	let { Value, Description, State, rDate, Hours } = $props();

	function toRequest(
		requestId: string,
		requestDescription: string,
		requestState: Status
	) {
		localStorage.setItem(
			requestId,
			JSON.stringify({
				body: requestDescription,
				state: convertStatusToString(requestState),
			})
		);
		goto(`/request/${requestId}`);
	}
	function convertStatusToString(status: any): string {
		switch (status) {
			case Status.Accepted:
				return "Accepted";
			case Status.Pending:
				return "Pending";
			case Status.Denied:
				return "Denied";
			case Status.Returned:
				return "Returned";
			default:
				return "Unknown";
		}
	}
	function dateToReadable(dateString: string): string {
		// basically convert 2023-06-11 12:46:10.000 to June 11, 2023 at 12:46 PM
		const date = new Date(dateString);
		return (
			date.toLocaleDateString(undefined, {
				year: "numeric",
				month: "long",
				day: "numeric",
			}) +
			" at " +
			date.toLocaleTimeString(undefined, {
				hour: "2-digit",
				minute: "2-digit",
			})
		);
	}
</script>

<button
	class="request-button"
	onclick={() => toRequest(Value, Description, State)}
	onkeyup={(e) => {
		if (e.key === "Enter") toRequest(Value, Description, State);
	}}
	tabindex="0"
>
	<p>
		{Description}<br />
		{dateToReadable(rDate)}<br />
		{Hours} eHour{parseFloat(Hours) !== 1 ? "s" : ""}
	</p>
</button>

<style>
	.request-button {
		display: block;
		width: 100%;
		color: white;
		text-align: left;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 0.1rem 1rem;
		border-radius: 8px;
		margin-bottom: 0.5rem;
		font-weight: 500;
		box-sizing: border-box;

		cursor: pointer;
	}
</style>
