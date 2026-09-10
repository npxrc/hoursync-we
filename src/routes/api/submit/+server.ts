import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import ParseHtmlToRequestList from "../parseHtmlToRequestList.js";

const MAX_EHOURS = 99.75;

export async function GET() {
	return new Response(null, { status: 405 });
}

export async function POST({ request, cookies }) {
	const startTime = performance.now();

	const sessionId = cookies.get("sessionId");

	if (!sessionId) {
		console.debug("[/api/submit/] Received unauthenticated request");

		return new Response(JSON.stringify({ error: "Missing sessionId" }), {
			status: 401,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	console.debug("[/api/submit/] Received request for session:", sessionId);

	const formData = await request.formData();

	const title = formData.get("title");
	const activityDate = formData.get("activityDate");
	const hours = formData.get("hours");
	const description = formData.get("description");

	if (
		typeof title !== "string" ||
		typeof activityDate !== "string" ||
		typeof hours !== "string" ||
		typeof description !== "string"
	) {
		return new Response(
			JSON.stringify({ error: "Missing or invalid form fields" }),
			{
				status: 400,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}

	const requestedHours = Number(hours);

	if (!Number.isFinite(requestedHours)) {
		return new Response(
			JSON.stringify({ error: "Hours must be a valid number" }),
			{
				status: 400,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}

	if (requestedHours > MAX_EHOURS) {
		return new Response(
			JSON.stringify({
				error: `Requests over ${MAX_EHOURS} eHours are not allowed`,
			}),
			{
				status: 400,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}

	const images = formData.getAll("files[]");

	const upstreamFormData = new FormData();

	upstreamFormData.append("title", title);
	console.debug(
		"[/api/submit/] Submitting eHours request with title:",
		title
	);
	upstreamFormData.append("activityDate", activityDate);
	console.debug(
		"[/api/submit/] Submitting eHours request with activityDate:",
		activityDate
	);
	upstreamFormData.append("hours", hours);
	console.debug(
		"[/api/submit/] Submitting eHours request with hours:",
		hours
	);
	upstreamFormData.append("description", description);
	console.debug(
		"[/api/submit/] Submitting eHours request with description:",
		description.slice(0, 30) + "..."
	);

	for (const image of images) {
		if (image instanceof File) {
			upstreamFormData.append("files[]", image, image.name);
			console.debug(
				"[/api/submit/] Submitting eHours request with image:",
				image.name
			);
		}
	}

	const httpClient = CreateHttpClient(sessionId);

	try {
		// const response = await httpClient.post(
		// 	"https://academyendorsement.olatheschools.com/Student/makeRequest.php",
		// 	upstreamFormData,
		// 	{
		// 		headers: {
		// 			"User-Agent":
		// 				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
		// 		},
		// 	}
		// );
		//@ts-ignore
		const response: { data: string } = {
			data: "<html><head><style>#HourCount,#eHourRequests,th,td {border: 1px solid black;position: center;color: rgb(47, 47, 48);}#HourCount,#eHourRequests {padding-left: 50px;width: 75%;}th {height: 50px;}table.progress {border-collapse: collapse;width: 80%;}table.progress td {border: 2px solid black;height: 40px;padding: 0px;}table.progress th {border: 2px solid black;height: 40px;padding: 0px;}table.progress td.sem {width: 12.5%;}table.progress td.narrow {white-space: nowrap;}table.progress td.wide {width: 12.5%;}table.progress td.wide2 {width: 100%;}table.progress .bar {display: block;background: #02ff009e;height: 100%;}table.progress .bar2 {display: block;background: #1bad02;height: 100%;}*/</style><link type=\"text/css\" href=\"../stylesV2/StudentStyles/studentEHours.css\" rel=\"stylesheet\"><link rel=\"icon\" href=\"favicon.ico\" /><link rel=\"preconnect\" href=\"https://fonts.googleapis.com\"><link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin><link href=\"https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap\" rel=\"stylesheet\"><link rel=\"icon\" href=\"favicon.ico\" /></head><body><div class=\"container\"><header><h1>Endorsement Tracking</h1><div class=\"tab\"><a href=\"studentHome.php\" style=\"filter: contrast(0.8);\"><button class=\"button\">Home</button></a><a style=\"filter: contrast(0.8);\" href=\"studentEHours.php\"><button class=\"button\">eHours</button></a><!-- <a style=\"filter: contrast(0.8);\" href=\"courseCompleted.php\"><button class=\"tablinks\">Completed</button></a> --><a style=\"filter: contrast(0.8);\" href=\"../index.php\"><button class=\"button\" onclick=\"logOut()\">Logout</button></a></div>            <!-- <form action=\"updateCronTask.php\">                <input type=\"submit\" value=\"Cron Task Test\" />            </form> -->        </header><article><h1>eHours</h1><font color=\"black\" size=\"4\"><b>See your current eHours and Submit New eHours</b></font><br></br><div class=\"forms\"><a href=\"studentEHoursubmit.php\"><button class=\"formlink\">Submission Form</button></a><br><br></div><table class=\"progress\" style=\"max-width: 60%; margin: 0 auto;\"><tr><th colspan=\"16\">eHours Progress</th></tr><tr><td style=\"text-align:center\" colspan=\"2\">Where You Should Be Based on 200 Hours</td> <td class='wide'><div class='bar' style='width:100%' align='center'>254</div></td><td class='wide'><div class='bar' style='width:100%' align='center'>54</div></td><td class='wide'><div class='bar' style='width:100%' align='center'>320.5</div></td><td class='wide'><div class='bar' style='width:100%' align='center'>89.5</div></td><td class='wide'><div class='bar' style='width:100%' align='center'>51.5</div></td><td class='wide'><div class='bar' style='width:100%' align='center'>121.5</div></td><td class='wide'><div class='bar' style='width:100%' align='center'>0</div></td><td class='wide'><div class='bar' style='width:100%' align='center'></div></td></tr><tr><td rowspan=\"3\" class=\"narrow\">&nbsp; &nbsp; <b>Actual eHours</b> <br> &nbsp; <b>ProgressTowards:</b>&nbsp;</td><td style=\"text-align: center\" class=\"narrow\">Endorsement</td><td colspan='8' class='wide2'><div class='bar2' style='vertical-align: center;width:100%'><p class=\"whitetext\">891 / 200</p></div></td></tr><tr><td style=\"text-align: center\" class=\"narrow\">Endorse - Honors</td><td colspan='8' class='wide2'><div class='bar2' style='width:100%'><p class=\"whitetext\">891 / 300</p></div></td></tr><tr><td style=\"text-align: center\" class=\"narrow\">Endorse - High Honors</td><td colspan='8' class='wide2'><div class='bar2' style='width:100%'><p class=\"whitetext\">891 / 400</p></div></td></tr></table><br></article></form><center><table id='HourCount'><tr><th colspan=1>Returned Hours: 0</th><th colspan=1>Pending Hours: 125</th><th colspan=1>Accepted Hours: 891</th><th colspan=1>Denied Hours: 0</th></tr></table><br><table id='eHourRequests'><tr><th id=>Submission Description</th><th>Number of Hours</th><th>Date Submitted</th></tr><tr><th id=\"Returned_Hours\" colspan='3'>Returned eHour Requests</th></tr><tr><th id=\"Pending_Hours\" colspan='3'>Pending eHour Requests</th></tr><tr class='entry'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202608042137411.jpg|91281_202608042137412.jpg|91281_202608042137413.jpg|91281_202608042137414.jpg|91281_202608042137415.jpg|91281_202608042137416.jpg|' value = 91281|DA|2026-08-04,21:37:41.000 type='submit'> TSA Nationals [1] </button></form></td><td> 99.75 </td><td> 2026-08-04 21:37:41.000 </td></tr><tr class='entry'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='' value = 91281|DA|2026-08-04,21:37:42.000 type='submit'> TSA Nationals [2] </button></form></td><td> 25.25 </td><td> 2026-08-04 21:37:42.000 </td></tr><tr><th  id=\"Accepted_Hours\" colspan='3'>Accepted eHour Requests</th></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202306111246101.jpg|91281_202306111246102.jpg|91281_202306111246103.jpg|91281_202306111246104.jpg|91281_202306111246105.jpg|91281_202306111246106.jpg|'value = 91281|DA|2023-06-11,12:46:10.000 type='submit'> Populous Architectural Design Tour </button></form></td><td> 2.50 </td><td> 2023-06-11 12:46:10.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202511171141551.jpg|91281_202511171141552.jpg|91281_202511171141553.jpg|91281_202511171141554.jpg|91281_202511171141555.jpg|91281_202511171141556.jpg|91281_202511171141557.jpg|91281_202511171141558.jpg|'value = 91281|DA|2025-11-17,11:41:55.000 type='submit'> Trip to SCAD and Charleston </button></form></td><td> 85.00 </td><td> 2025-11-17 11:41:55.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202404062315091.jpg|91281_202404062315092.jpg|91281_202404062315093.jpg|91281_202404062315094.jpg|91281_202404062315095.jpg|91281_202404062315096.jpg|91281_202404062315097.jpg|91281_202404062315098.jpg|'value = 91281|DA|2024-04-06,23:15:09.000 type='submit'> Olathe Teen Council - Service and Meeting Hours </button></form></td><td> 48.00 </td><td> 2024-04-06 23:15:09.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202404101111581.jpg|'value = 91281|DA|2024-04-10,11:11:58.000 type='submit'> Weather App </button></form></td><td> 3.00 </td><td> 2024-04-10 11:11:58.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202408251358221.jpg|91281_202408251358222.jpg|91281_202408251358223.jpg|91281_202408251358224.jpg|'value = 91281|DA|2024-08-25,13:58:22.000 type='submit'> Creation of HourSync </button></form></td><td> 75.00 </td><td> 2024-08-25 13:58:22.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202407302248261.jpg|91281_202407302248262.jpg|91281_202407302248263.jpg|91281_202407302248264.jpg|'value = 91281|DA|2024-07-30,22:48:26.000 type='submit'> Operation Sticker Shock </button></form></td><td> 5.00 </td><td> 2024-07-30 22:48:26.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202409101932161.jpg|91281_202409101932162.jpg|91281_202409101932163.jpg|91281_202409101932164.jpg|91281_202409101932165.jpg|'value = 91281|DA|2024-09-10,19:32:16.000 type='submit'> Old Settlers Day Parade </button></form></td><td> 3.00 </td><td> 2024-09-10 19:32:16.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202409181440531.jpg|91281_202409181440532.jpg|91281_202409181440533.jpg|91281_202409181440534.jpg|'value = 91281|DA|2024-09-18,14:40:53.000 type='submit'> Creating Shirt Designs for Olathe Orchestras </button></form></td><td> 1.00 </td><td> 2024-09-18 14:40:53.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-09-18,22:03:04.000 type='submit'> Olathe Mayors Children&#39;s Fund Volunteering </button></form></td><td> 3.00 </td><td> 2024-09-18 22:03:04.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-09-19,14:19:33.000 type='submit'> OMCF Meeting 9/11 </button></form></td><td> 1.50 </td><td> 2024-09-19 14:19:33.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-11-14,09:45:12.000 type='submit'> ACE Mentorship Meeting  </button></form></td><td> 1.50 </td><td> 2024-11-14 09:45:12.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-09-27,12:36:07.000 type='submit'> ACE Mentorship Meeting </button></form></td><td> 1.00 </td><td> 2024-09-27 12:36:07.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202410021207221.jpg|91281_202410021207222.jpg|91281_202410021207233.jpg|91281_202410021207234.jpg|91281_202410021207235.jpg|91281_202410021207236.jpg|91281_202410021207237.jpg|91281_202410021207238.jpg|'value = 91281|DA|2024-10-02,12:07:23.000 type='submit'> Trip to India Submission 1 </button></form></td><td> 99.75 </td><td> 2024-10-02 12:07:23.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-10-02,12:08:45.000 type='submit'> Trip to India Submission 2 </button></form></td><td> 99.75 </td><td> 2024-10-02 12:08:45.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-10-02,12:09:09.000 type='submit'> Trip to India Submission 3 </button></form></td><td> 99.75 </td><td> 2024-10-02 12:09:09.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-12-02,12:00:28.000 type='submit'> Presentation for Olathe Teen Council </button></form></td><td> 4.00 </td><td> 2024-12-02 12:00:28.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202405081110511.jpg|'value = 91281|DA|2024-05-08,11:10:51.000 type='submit'> Presentation at Summit Trail  </button></form></td><td> 3.00 </td><td> 2024-05-08 11:10:51.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2025-01-11,18:11:28.000 type='submit'> ACE Mentorship Meeting 11/6 </button></form></td><td> 1.50 </td><td> 2025-01-11 18:11:28.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2025-08-24,17:12:54.000 type='submit'> Olathe Teen Council Kickoff Meeting </button></form></td><td> 1.50 </td><td> 2025-08-24 17:12:54.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202501162013271.jpg|91281_202501162013272.jpg|'value = 91281|DA|2025-01-16,20:13:27.000 type='submit'> Web Browser </button></form></td><td> 3.00 </td><td> 2025-01-16 20:13:27.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2025-01-22,16:55:20.000 type='submit'> OTC Meeting 1/22/2025 </button></form></td><td> 1.50 </td><td> 2025-01-22 16:55:20.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202604021230441.jpg|91281_202604021230442.jpg|91281_202604021230443.jpg|91281_202604021230444.jpg|91281_202604021230445.jpg|91281_202604021230446.jpg|91281_202604021230447.jpg|91281_202604021230448.jpg|'value = 91281|DA|2026-04-02,12:30:44.000 type='submit'> TSA 2025-26 [1] </button></form></td><td> 99.75 </td><td> 2026-04-02 12:30:44.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2026-04-02,12:26:07.000 type='submit'> TSA 2025-26 [2] </button></form></td><td> 20.25 </td><td> 2026-04-02 12:26:07.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-08-24,07:55:34.000 type='submit'> Olathe Teen Council Meeting 8/19 </button></form></td><td> 1.50 </td><td> 2024-08-24 07:55:34.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202405181905241.jpg|91281_202405181905242.jpg|'value = 91281|DA|2024-05-18,19:05:24.000 type='submit'> Creation of &#34;Budget Quizlet&#34; </button></form></td><td> 22.00 </td><td> 2024-05-18 19:05:24.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-05-22,08:59:23.000 type='submit'> Presentation for City Council </button></form></td><td> 4.00 </td><td> 2024-05-22 08:59:23.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2026-03-05,17:32:43.000 type='submit'> City of Olathe Intern Job Shadow </button></form></td><td> 1.50 </td><td> 2026-03-05 17:32:43.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202604041334011.jpg|91281_202604041334012.jpg|'value = 91281|DA|2026-04-04,13:34:01.000 type='submit'> ACE Mentorship 2025 </button></form></td><td> 50.00 </td><td> 2026-04-04 13:34:01.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202305031849411.jpg|91281_202305031849412.jpg|91281_202305031849413.jpg|'value = 91281|DA|2023-05-03,18:49:41.000 type='submit'> Design Academy Senior Capstones </button></form></td><td> 1.00 </td><td> 2023-05-03 18:49:41.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-03-22,10:13:25.000 type='submit'> Cutting Boards </button></form></td><td> 1.00 </td><td> 2024-03-22 10:13:25.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202312021147461.jpg|91281_202312021147462.jpg|91281_202312021147463.jpg|91281_202312021147464.jpg|91281_202312021147465.jpg|91281_202312021147466.jpg|'value = 91281|DA|2023-12-02,11:47:46.000 type='submit'> Black and Veatch UMKC School Tour </button></form></td><td> 3.00 </td><td> 2023-12-02 11:47:46.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-08-20,21:44:06.000 type='submit'> Helping Mrs. Schuberth Sort Clay </button></form></td><td> 1.00 </td><td> 2024-08-20 21:44:06.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202408252209431.jpg|91281_202408252209432.jpg|91281_202408252209433.jpg|91281_202408252209434.jpg|91281_202408252209435.jpg|91281_202408252209436.jpg|91281_202408252209437.jpg|91281_202408252209438.jpg|91281_202408252209439.jpg|91281_2024082522094310.jpg|'value = 91281|DA|2024-08-25,22:09:43.000 type='submit'> Trip to Italy </button></form></td><td> 99.50 </td><td> 2024-08-25 22:09:43.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202409051508131.jpg|91281_202409051508132.jpg|91281_202409051508133.jpg|91281_202409051508134.jpg|'value = 91281|DA|2024-09-05,15:08:13.000 type='submit'> 3D Printing and Modelling for AP Euro </button></form></td><td> 2.00 </td><td> 2024-09-05 15:08:13.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-09-18,21:57:46.000 type='submit'> Olathe Teen Council Meeting 9/18 </button></form></td><td> 1.00 </td><td> 2024-09-18 21:57:46.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-11-14,09:25:10.000 type='submit'> ACE Mentorship Meeting </button></form></td><td> 1.50 </td><td> 2024-11-14 09:25:10.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202409051500281.jpg|91281_202409051500282.jpg|91281_202409051500283.jpg|91281_202409051500284.jpg|'value = 91281|DA|2024-09-05,15:00:28.000 type='submit'> Old Settlers Float Decoration </button></form></td><td> 5.00 </td><td> 2024-09-05 15:00:28.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202408070005251.jpg|91281_202408070005252.jpg|91281_202408070005253.jpg|91281_202408070005254.jpg|'value = 91281|DA|2024-08-07,00:05:25.000 type='submit'> Mahaffie Stagecoach Fence Painting </button></form></td><td> 3.00 </td><td> 2024-08-07 00:05:25.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202408311513361.jpg|'value = 91281|DA|2024-08-31,15:13:36.000 type='submit'> Mahaffie Trail Cleanup - Olathe Teen Council </button></form></td><td> 2.00 </td><td> 2024-08-31 15:13:36.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202404200944031.jpg|91281_202404200944032.jpg|91281_202404200944033.jpg|91281_202404200944034.jpg|'value = 91281|DA|2024-04-20,09:44:03.000 type='submit'> Volunteering at Heartstrings </button></form></td><td> 3.00 </td><td> 2024-04-20 09:44:03.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202404200953371.jpg|91281_202404200953372.jpg|91281_202404200953373.jpg|91281_202404200953374.jpg|'value = 91281|DA|2024-04-20,09:53:37.000 type='submit'> Student Government Day </button></form></td><td> 10.00 </td><td> 2024-04-20 09:53:37.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202404201010391.jpg|91281_202404201010392.jpg|91281_202404201010393.jpg|91281_202404201010394.jpg|'value = 91281|DA|2024-04-20,10:10:39.000 type='submit'> KU / K-State Showcase Downtown </button></form></td><td> 2.00 </td><td> 2024-04-20 10:10:39.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202404241929531.jpg|91281_202404241929532.jpg|'value = 91281|DA|2024-04-24,19:29:53.000 type='submit'> Olathe Teen Council Meeting </button></form></td><td> 2.00 </td><td> 2024-04-24 19:29:53.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-10-23,10:24:22.000 type='submit'> ACE Mentorship Meeting 10/16 </button></form></td><td> 1.50 </td><td> 2024-10-23 10:24:22.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-10-25,09:15:26.000 type='submit'> ACE Mentorship Meeting 10/23 </button></form></td><td> 1.50 </td><td> 2024-10-25 09:15:26.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-10-25,09:24:00.000 type='submit'> OTC Meeting </button></form></td><td> 2.00 </td><td> 2024-10-25 09:24:00.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value='91281_202410101225071.jpg|91281_202410101225072.jpg|91281_202410101225073.jpg|'value = 91281|DA|2024-10-10,12:25:07.000 type='submit'> American Royal Site Tour </button></form></td><td> 1.50 </td><td> 2024-10-10 12:25:07.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-10-10,12:49:04.000 type='submit'> Olathe Teen Council Meeting 9/25 </button></form></td><td> 2.00 </td><td> 2024-10-10 12:49:04.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-10-10,14:27:34.000 type='submit'> Olathe Mayors Children&#39;s Fund Meeting 10/2 </button></form></td><td> 1.50 </td><td> 2024-10-10 14:27:34.000 </td></tr><tr class='returnedhours'><td align='left'><form action='eHourDescription.php' method='post'><button class='btn' name = 'ehours_request_descr'data-value=''value = 91281|DA|2024-10-10,14:32:07.000 type='submit'> Olathe Teen Council Meeting 10/9 </button></form></td><td> 1.75 </td><td> 2024-10-10 14:32:07.000 </td></tr><tr><th id=\"Denied_Hours\" colspan='3'>Denied eHour Requests</th></tr></table></div><script type=\"text/javascript\">function logOut() {var loggedIn = false;}</script><br><br></body></html>",
		}; // Mock response for testing

		const responseString = response.data;

		console.debug(
			`[/api/submit/] Upstream request completed in ${performance.now() - startTime}ms`
		);
		let parsedRequests:
			| ReturnType<typeof ParseHtmlToRequestList>
			| undefined;
		try {
			parsedRequests = ParseHtmlToRequestList(responseString);
		} catch (parseError) {
			console.warn(
				"[/api/submit/] Could not parse upstream response:",
				parseError
			);
			if (responseString?.includes("See your current eHours")) {
				return new Response(
					JSON.stringify({
						success: true,
						message:
							"The request was submitted but HourSync was unable to confirm it was added. Please check your eHours requests to confirm.",
						response: responseString,
						error:
							parseError instanceof Error
								? parseError.message
								: String(parseError),
					}),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
						},
					}
				);
			}
			return new Response(
				JSON.stringify({
					success: false,
					message:
						"The request was uploaded but HourSync is unable to confirm it was accepted by the server. Please check your eHours requests to confirm.",
					elapsed: performance.now() - startTime,
					response: responseString,
					error:
						parseError instanceof Error
							? parseError.message
							: String(parseError),
				}),
				{
					status: 200,
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
		}
		const createdRequest = parsedRequests?.Pending.find(
			(req) => req.Description === title
		);
		if (createdRequest) {
			return new Response(
				JSON.stringify({
					success: true,
					response: responseString,
					elapsed: performance.now() - startTime,
				}),
				{
					status: 200,
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
		}
		console.debug("[/api/submit/] Upstream request did not succeed");
		return new Response(
			JSON.stringify({
				success: false,
				message: "The server did not accept the request",
				response: responseString,
				elapsed: performance.now() - startTime,
			}),
			{
				status: 502,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	} catch (error) {
		console.error("[/api/submit/] Request submission failed:", error);

		return new Response(
			JSON.stringify({
				success: false,
				message: "Failed to submit request",
				elapsed: performance.now() - startTime,
				response: null,
				error: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 502,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}
}

function CreateHttpClient(sessionId: string) {
	const jar = new CookieJar();

	jar.setCookieSync(
		`PHPSESSID=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax`,
		"https://academyendorsement.olatheschools.com"
	);

	return wrapper(
		axios.create({
			jar,
			withCredentials: true,
		})
	);
}
