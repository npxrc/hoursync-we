<script lang="ts">
	import type { Snippet } from "svelte";

	type Card = {
		head: string;
		content: string;
		rawHtml: boolean;
	};

	type QuickAction = {
		label: string;
		onclick: () => void;
		disabled?: boolean;
	};

	type Props = {
		title?: string;
		titleOptions?: {
			italic: boolean;
			rawHtml: boolean;
		};
		cards?: Card[];
		quickActions?: QuickAction[];
		version?: string | null;
		children?: Snippet;
	};

	let {
		title = "Default Title",
		titleOptions = {
			italic: false,
			rawHtml: false,
		},
		cards = [],
		quickActions = [],
		version = null,
		children,
	}: Props = $props();
</script>

<h1 class="serif {titleOptions.italic ? 'italic' : ''}">
	{#if titleOptions.rawHtml}
		{@html title}
	{:else}
		{title}
	{/if}
</h1>
<div class="cards">
	<section class="left-card quick-actions">
		<b class="head">Quick Actions</b>
		{#each quickActions as action}
			<button onclick={action.onclick} disabled={action.disabled}>
				{action.label}
			</button>
		{/each}
	</section>
	{@render children?.()}
	{#each cards as card}
		<section class="left-card">
			<div class="head">{card.head}</div>
			{#if card.rawHtml}
				{@html card.content}
			{:else}
				<p>{card.content}</p>
			{/if}
		</section>
	{/each}
</div>

{#if version}
	<div class="versionInfo">
		<a
			href="https://github.com/npxrc/hoursync-we"
			target="_blank"
			rel="noopener noreferrer">Version: {version}</a
		>
	</div>
{/if}

<style>
	h1 {
		font-size: 4rem;
		margin: 0.5rem 0 1.3rem 0;
	}
	.serif {
		font-family: "Instrument Serif", serif;
	}
	.serif.italic {
		font-style: italic;
		font-weight: 400;
	}
	.versionInfo a {
		color: rgba(255, 255, 255, 0.7);
		text-decoration: underline;
	}

	:global(.left-card) {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 1rem;
		padding-right: 2rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		margin-left: -10px;
		font-weight: 500;
		box-sizing: border-box;
	}
	:global(.left-card .head) {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 0.3rem;
		padding-bottom: 0.2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.2);
		width: 100%;
		display: block;
	}
	:global(.left-card p) {
		margin: 0.5rem 0;
	}
	:global(.left-card progress) {
		width: 100%;
	}
	.quick-actions button {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 5px;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 500;
		margin-top: 0.25rem;
		width: 100%;
		text-align: left;
		transition: all 250ms ease;
	}
	.quick-actions button:hover {
		background: rgba(255, 255, 255, 0.07);
	}
	.quick-actions button:disabled {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.5);
		cursor: not-allowed;
	}
</style>
