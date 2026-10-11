<script>
	import "../app.css";
	let { children } = $props();
</script>

<svelte:head>
	<title>HourSync</title>
	<meta name="author" content="Neil Patrao" />
	<meta
		name="description"
		content="The fastest and easiest way to submit eHours for the Olathe District, guaranteed. Built for your future."
	/>

	<meta property="og:title" content="HourSync" />
	<meta
		property="og:description"
		content="The fastest and easiest way to submit eHours for the Olathe District, guaranteed. Built for your future."
	/>
	<meta property="og:image" content="https://hoursync.net/assets/meta.png" />
	<meta
		name="keywords"
		content="HourSync, eHours, HourSync for Web, HourSync for Windows, Olathe Public Schools, academy endorsement, ehours submission"
	/>
	<meta property="og:url" content="https://web.hoursync.net/" />
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
