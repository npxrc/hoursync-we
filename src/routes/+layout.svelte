<script>
	import "../app.css";
	let { children } = $props();
</script>

<svelte:head>
	<link
		rel="icon"
		href="/assets/1x/logo-regular-flat.png"
		media="(prefers-color-scheme: light)"
	/>
	<link
		rel="icon"
		href="/assets/1x/logo-dark-flat.png"
		media="(prefers-color-scheme: dark)"
	/>
</svelte:head>

<div id="contentContainer" class="grain">
	{@render children()}
</div>
<div class="blob">
	<img
		src="/assets/blob.png"
		alt="A blob that uses the HourSync gradient as a decorative detail."
	/>
</div>

<style>
	:global(body) {
		padding: 0;
		margin: 0;
		background-color: var(--slate);
	}
	.grain {
		background-image: url("/assets/noise-asset-8.png");
		background-repeat: repeat;
		background-size: 64px;
	}
	.grain.fine {
		background-size: 32px;
	}
	#contentContainer {
		height: 100vh;
		width: 100vw;
		position: absolute;
		top: 0;
		left: 0;
		z-index: 5;
	}
	.blob {
		position: absolute;
		bottom: 0;
		left: auto;
		right: auto;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100vw;
	}
</style>
