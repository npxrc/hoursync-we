<script>
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
</script>

<div id="app">
	<div class="content">
		{#if page.status == 404}
			<h1>404 - Page Not Found</h1>
			<p>The page you are looking for does not exist.</p>
			<button onclick={() => goto("/")}>Back</button>
		{:else if page.status == 500}
			<h1>500 - Internal Server Error</h1>
			<p>Something went wrong on our end. Please try again later.</p>
		{:else}
			<h1>{page.status} - {page.error?.message}</h1>
			<p>{page.error?.message}</p>
		{/if}
	</div>
</div>

<style>
	#app {
		display: block;
		color: white;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		height: calc(100vh - 30px);
		width: calc(100vw - 30px);
		box-sizing: border-box;
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.1),
			rgba(255, 255, 255, 0.1)
		);
		border-radius: 20px;
	}
	.content {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}
</style>
