<script>
	let color1 = $state("");
	let color2 = $state("");
	let color3 = $state("");
	let color4 = $state("");
</script>

<input type="text" placeholder="Enter color 1" bind:value={color1} />
<input type="text" placeholder="Enter color 2" bind:value={color2} />
<input type="text" placeholder="Enter color 3" bind:value={color3} />
<input type="text" placeholder="Enter color 4" bind:value={color4} />

<div class="color-box" style="background-color: {color1};"></div>
<div class="color-box" style="background-color: {color2};"></div>
<div class="color-box" style="background-color: {color3};"></div>
<div class="color-box" style="background-color: {color4};"></div>

<style>
	.color-box {
		width: 100px;
		height: 100px;
		margin: 10px;
	}
</style>
