<script lang="ts">
	import { goto } from "$app/navigation";

	let username = $state("");
	let password = $state("");
	let errorStatusText = $state("");
	let errorMessage = $state("");

	async function login() {
		try {
			errorStatusText = "";
			errorMessage = "";
			const response = await fetch("/api/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ username, password }),
			});

			if (response.ok) {
				const data = await response.json();
				console.log("Login successful:", data);
				const html = data.html;
				const academy = ExtractBetween(
					html,
					">Welcome to your",
					" Endorsement"
				);
				const name = ExtractBetween(html, "Tracking, ", "</");
				localStorage.setItem(
					"userData",
					JSON.stringify({ name, academy })
				);
				if (data.success) {
					await goto("/home");
				}
			} else {
				const data = await response.json();
				errorStatusText = response.statusText;
				errorMessage = data.error || "An error occurred during login";
				console.error("Login failed:", response.statusText);
			}
		} catch (error) {
			console.error("Error during login:", error);
		}
	}
	function ExtractBetween(
		source: string,
		start: string,
		end: string
	): string | null {
		var startIndex = source.indexOf(start);
		if (startIndex === -1) {
			return null;
		}
		startIndex += start.length;

		var endIndex = source.indexOf(end, startIndex);
		if (endIndex === -1) {
			return null;
		}
		return source.slice(startIndex, endIndex).trim();
	}
</script>

<svelte:head>
	<title>HourSync - Login</title>
</svelte:head>

<div class="modal-bg">
	<div class="modal grain fine">
		<div class="left">
			<h1>Welcome back to <b>HourSync</b></h1>
			<p>
				Sign in using your student credentials.<br />No account creation
				necessary.
			</p>
			<div class="errorMessage {errorStatusText ? 'active' : ''}">
				<div class="header">{errorStatusText}</div>
				<div class="message">{errorMessage}</div>
			</div>
			<label for="username">District Username</label><br />
			<input
				type="text"
				name="username"
				placeholder="Enter your district username"
				required
				bind:value={username}
			/>
			<br /><br />
			<label for="password">District Password</label>
			<br />
			<input
				type="password"
				name="password"
				placeholder="Enter your district password"
				required
				bind:value={password}
			/>
			<br /><br />
			<button type="submit" onclick={login}>Sign In</button>
		</div>
		<div class="right">
			<!-- to be added later -->
		</div>
	</div>
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
	.modal {
		height: 100%;
		width: 100%;
		display: grid;
		grid-template-columns: 1fr 1fr;
		border-radius: 10px;
	}
	.modal-bg {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0;
		padding: 0;
		color: var(--light-text);
		width: 60vw;
		border-radius: 10px;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.5),
			rgba(255, 255, 255, 0.1)
		);
	}
	h1,
	h1 b {
		font-size: 4rem;
		margin: 1rem 0 1rem 0;
		font-family: "Instrument Serif";
		font-style: italic;
		font-weight: 400;
	}
	h1 b {
		font-weight: 700;
	}
	p,
	label {
		font-size: 1.25rem;
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
	.left,
	.right {
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		padding: 2rem;
		margin: 0;
	}
	.right {
		background-color: rgba(255, 255, 255, 0.1);
		border-radius: 0 10px 10px 0;
	}

	input[type="text"],
	input[type="password"] {
		width: 100%;
		padding: 0.5rem;
		box-sizing: border-box;
		margin: 0.5rem 0;
		border: 1px solid var(--light-text);
		border-radius: 5px;
		background-color: rgba(255, 255, 255, 0.1);
		color: var(--light-text);
	}

	.errorMessage {
		display: none;
	}
	.errorMessage.active {
		border-radius: 10px;
		display: block;
		background-color: rgba(255, 0, 0, 0.1);
		border: 1px solid var(--gradient-1);
		color: var(--gradient-1);
		padding: 0.5rem;
		margin: 0.5rem 0;
		box-sizing: border-box;
	}
	.errorMessage .header {
		font-weight: bold;
	}

	@media screen and (max-width: 1300px) {
		.modal-bg {
			width: 90vw;
			height: 75vh;
		}
	}
	@media screen and (max-width: 1000px) {
		.modal-bg {
			width: 90vw;
			height: 90vh;
		}
	}
	@media screen and (max-width: 675px) {
		.modal {
			grid-template-columns: 1fr;
		}
		.modal-bg {
			width: 100vw;
			height: 100vh;
			background: none;
		}
		.left,
		.right {
			padding: 2rem;
			background-color: none;
		}
		.left {
			height: 100vh;
		}
		.right {
			display: none;
		}
	}
</style>
