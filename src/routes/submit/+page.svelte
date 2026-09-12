<script lang="ts">
	import { page } from "$app/state";
	import { onMount } from "svelte";
	import ParseHtmlToRequestList from "../api/parseHtmlToRequestList";
	import { goto, replaceState } from "$app/navigation";

	let studentId = $state("");
	let title = $state("");
	let activityDate = $state("");
	let hours = $state("");
	let description = $state("");
	let files: FileList | null = $state(null);

	let submitting = $state(false);
	let error = $state("");
	let success = $state("");
	let syncMessage = $state("");

	async function submitForm(event: SubmitEvent) {
		event.preventDefault();

		submitting = true;
		error = "";
		success = "";

		const form = event.currentTarget as HTMLFormElement;
		const formData = new FormData(form);

		try {
			const response = await fetch("/api/submit", {
				method: "POST",
				body: formData,
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				error =
					result.message ??
					result.error ??
					"Failed to submit request.";
				return;
			}

			success = "Request submitted successfully.";

			form.reset();
			title = "";
			activityDate = "";
			hours = "";
			description = "";
			files = null;
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: "Failed to submit request.";
		} finally {
			submitting = false;
		}
	}
	let timeout: string | number | NodeJS.Timeout | null | undefined = null;
	async function changeEvent(event: Event) {
		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(
			async () => {
				// post to /api/sync
				const response = await fetch("/api/sync", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						title,
						activityDate,
						hours,
						description,
					}),
				});

				if (!response.ok) {
					console.error("Failed to sync data:", response.statusText);
					error = "Failed to sync data: " + response.statusText;
				} else {
					const result = await response.json();
					console.log("Sync result:", result);
					syncMessage =
						"Data synced successfully at " +
						new Date().toLocaleTimeString();
					setTimeout(() => {
						syncMessage = "";
					}, 3000);
				}
			},
			5000 + Math.random() * 1000
		);
	}
	let fetchedStudentIdFromServer = false;
	let currentlyFetching = false;
	onMount(async () => {
		// first decide whether we're doing a template or not based on ? params in the url
		// e.g. /submit?createTemplate=true&title=My%20Template&hours=2&description=This%20is%20a%20template
		// set activity date to today by default since templates shouldn't copy previous dates
		let urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has("createTemplate")) {
			title = urlParams.get("title") || "";
			activityDate = new Date().toISOString().split("T")[0]; // today
			hours = urlParams.get("hours") || "";
			description = urlParams.get("description") || "";

			// clear the url params so that if the user refreshes the page, it doesn't keep the template values
			replaceState(window.location.pathname, document.title);
		} else {
			//@ts-ignore
			studentId = page.state.studentId;

			if (studentId) {
				console.debug("Student Id Received:", studentId);
			} else {
				console.debug("Fetching student ID...");
				if (fetchedStudentIdFromServer) {
					throw new Error(
						"Student ID not found in state and already fetched from server."
					);
				}
				fetchedStudentIdFromServer = true;
				fetch("/api/requests", {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
					},
				}).then(async (response) => {
					if (!response.ok) {
						console.error(
							"Failed to fetch student ID:",
							response.statusText
						);
						error =
							"Failed to fetch student ID from the server. If this is your first eHour request, then syncing will only work after your first submission. This is to prevent abuse of draft saving.\r\nIf you have a request history and are still seeing this error, try again.\r\nError: " +
							response.statusText;
						return;
					}
					const result = await response.json();
					let parsedData = ParseHtmlToRequestList(result.html);
					studentId =
						[
							...parsedData.Accepted,
							...parsedData.Pending,
							...parsedData.Denied,
							...parsedData.Returned,
						][0].Value.split("|")[0] || "";
					console.debug("Fetched student ID from server:", studentId);
				});
			}
			var syncResult = await fetch("/api/sync", {
				method: "GET",
			});
			if (!syncResult.ok) {
				console.error(
					"Failed to sync data from server:",
					syncResult.statusText
				);
				error =
					"Failed to sync data from server: " + syncResult.statusText;
				return;
			}
			var syncData = await syncResult.json();
			if (syncData.length > 0) {
				console.debug("Syncing data from server:", syncData);
				title = syncData[0].title || "";
				activityDate = syncData[0].activityDate || "";
				hours = syncData[0].hours || "";
				description = syncData[0].description || "";

				success = "Data synced from server successfully.";
			}
		}
	});
</script>

<svelte:head>
	<title>HourSync - Submit Request</title>
</svelte:head>

<div id="app">
	<div id="left">
		<h1 class="serif italic">Submit Request</h1>
		<section class="left-card quick-actions">
			<b class="head">Quick Actions</b>
			<p>
				<button onclick={() => goto("/home")}>Back to Home</button>
			</p>
		</section>
		<section class="left-card">
			<b class="head">Request Submission Guide</b>
			<p>
				Submitting eHours can help you gain an endorsement from your
				academy, which will show up on your transcript.
				<br />
				<br />
				Below are the recommendations for an eHour request from the district:
				<br />
				<span class="indent">
					Please write a reflection on what you experienced and how
					this activity is connected to what you are learning in your
					Academy classes or to what happens in a professional career.
					Use your English/Language Arts skills when writing the
					reflection.
				</span>
			</p>
		</section>
	</div>
	<div id="right">
		<div class="status {error ? 'error' : success ? 'success' : ''}">
			<div class="content">
				<b class="head">{error ? "Error" : success ? "Success" : ""}</b>
				<p class="message">{error || success || ""}</p>
			</div>
			<div class="action">
				<button
					onclick={() => {
						error = "";
						success = "";
					}}
				>
					X
				</button>
			</div>
		</div>
		<form method="POST" enctype="multipart/form-data" onsubmit={submitForm}>
			<div class="formQuestions">
				<p class="label">Title</p>
				<input
					name="title"
					bind:value={title}
					onkeydown={changeEvent}
					required
				/>

				<p class="label">Activity Date</p>
				<input
					type="date"
					name="activityDate"
					bind:value={activityDate}
					onchange={changeEvent}
					required
				/>

				<p class="label">Hours</p>
				<input
					type="number"
					name="hours"
					bind:value={hours}
					onchange={changeEvent}
					min="0"
					max="99.75"
					step="0.25"
					required
				/>

				<p class="label">Description</p>
				<textarea
					name="description"
					bind:value={description}
					onkeyup={changeEvent}
					required
				></textarea>

				<p class="label">Images</p>
				<input
					type="file"
					name="files[]"
					accept="image/*"
					multiple
					bind:files
				/>
				<span class="syncMessage">{syncMessage}</span>
			</div>

			<button type="submit" class="submitButton" disabled={submitting}>
				{submitting ? "Submitting..." : "Submit Request"}
			</button>
		</form>
	</div>
</div>

<style>
	#app {
		display: grid;
		grid-template-columns: 35fr 65fr;
		gap: 2rem;
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
	#left,
	#right {
		padding: 2rem;
		border-radius: 8px;
		box-sizing: border-box;
		height: 100%;
		overflow-y: auto;
	}
	#right {
		background: rgba(255, 255, 255, 0.08);
		border-radius: 0 20px 20px 0;
	}
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
	.left-card {
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
	.left-card .head {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 0.3rem;
		padding-bottom: 0.2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.2);
		width: 100%;
		display: block;
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
	.indent {
		margin-left: 1rem;
		display: block;
	}

	form {
		width: 100%;
		display: flex;
		flex-direction: column;
	}

	p.label {
		font-weight: 500;
		margin: 6px 0 6px 0;
		font-size: 1.2rem;
	}

	input {
		padding: 0.5rem;
		box-sizing: border-box;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border-radius: 5px;
		width: 100%;
		margin-bottom: 6px;
	}
	textarea {
		width: 100%;
		height: 150px;
		padding: 0.5rem;
		box-sizing: border-box;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border-radius: 5px;

		margin-bottom: 6px;
	}
	.formQuestions {
		margin-bottom: 1rem;
	}

	.status {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 0.5rem 0.8rem;
		border-radius: 8px;
		font-weight: 500;
		width: 100%;
		box-sizing: border-box;
		display: none;
	}

	.status.error,
	.status.success {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.status button {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: white;
		width: 30px;
		height: 30px;
		border-radius: 100%;
		cursor: pointer;
	}
	.status button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.status.error {
		border-color: #d66161;
		background: rgba(255, 77, 77, 0.1);
		color: #ff4d4d;
	}
	.status.success {
		background: #49632c;
		color: white;
	}

	.status .head {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 0.3rem;
		display: block;
	}
	.status .message {
		margin-top: 0;
		margin-bottom: 0.5rem;
	}
	.status .content {
		margin-right: 1rem;
	}

	.syncMessage {
		font-size: 0.9rem;
		color: #a0a0a0;
		margin-top: 0.5rem;
		display: block;
	}

	button.submitButton {
		background: var(--gradient-4);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 5px;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 500;
		margin-top: 0.25rem;
		width: 100%;
		text-align: center;
		transition: all 250ms ease;
	}
	button.submitButton:hover {
		background: #2f85ee;
	}

	@media screen and (max-width: 1200px) {
		#app {
			grid-template-columns: 1fr;
			grid-template-rows: auto auto;
			height: calc(100vh - 2rem);
			overflow-y: auto;
			gap: 0;
			margin: 1rem 0;
		}
		#left,
		#right {
			height: auto;
			padding: 1.5rem;
			box-sizing: border-box;
		}
		#left {
			display: grid;
			grid-template-columns: 1fr 2fr;
		}
		#left h1 {
			width: 90%;
		}
		.left-card {
			margin-left: 0;
		}
		#right {
			border-radius: 0 0 20px 20px;
		}
	}

	@media screen and (max-width: 800px) {
		#left {
			grid-template-columns: 2fr 3fr;
		}
	}
	@media screen and (max-width: 700px) {
		#left {
			grid-template-columns: 1fr;
		}
	}
</style>
