<script lang="ts">
	import type { EHourRequest } from "$lib/types.js";
	import RequestButton from "./RequestButton.svelte";

	let {
		description,
		requests,
	}: {
		description: string;
		requests: EHourRequest[];
	} = $props();

	let totalHours = $derived(
		requests.reduce(
			(total, request) => total + (parseFloat(request.Hours) || 0),
			0
		)
	);
</script>

{#if requests.length === 1}
	<RequestButton {...requests[0]} rDate={requests[0].Date} />
{:else}
	<details class="request-group">
		<summary>
			<span class="description">{description}</span>
			<span class="group-meta">
				{requests.length} requests · {totalHours} eHours
			</span>
		</summary>

		<div class="group-requests">
			{#each requests as request (request.Value)}
				<RequestButton {...request} rDate={request.Date} />
			{/each}
		</div>
	</details>
{/if}

<style>
	.request-group {
		margin-bottom: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.08);
	}

	.request-group summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.8rem 1rem;
		cursor: pointer;
		font-weight: 500;
		list-style-position: inside;
	}

	.request-group summary::marker {
		color: rgba(255, 255, 255, 0.65);
	}

	.description {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.group-meta {
		flex: 0 0 auto;
		color: rgba(255, 255, 255, 0.65);
		font-size: 0.9rem;
		white-space: nowrap;
	}

	.group-requests {
		padding: 0 0.5rem 0.5rem;
	}

	.group-requests :global(.request-button) {
		margin-bottom: 0.35rem;
	}

	.group-requests :global(.request-button:last-child) {
		margin-bottom: 0;
	}

	@media screen and (max-width: 600px) {
		.request-group summary {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.25rem;
		}

		.group-meta {
			margin-left: 1.1rem;
		}
	}
</style>
