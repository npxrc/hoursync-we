import * as cheerio from "cheerio";
import { Status, type EHourRequest, type EHourRequestList } from "$lib/types";

export default function ParseHtmlToRequestList(html: string): EHourRequestList {
	const $ = cheerio.load(html);
	const table = $("table#eHourRequests").first();
	if (!table || table.length === 0) {
		throw new Error("No table found");
	}
	try {
		const tbody = table.find("tbody").first();
		const rows = tbody.find("tr");
		const requestList: EHourRequestList = {
			Accepted: [],
			Denied: [],
			Pending: [],
			Returned: [],
		};

		let sectionsMap = {
			Accepted_Hours: Status.Accepted,
			Denied_Hours: Status.Denied,
			Pending_Hours: Status.Pending,
			Returned_Hours: Status.Returned,
		};
		let currentSection = Status.Pending;
		for (let i = 0; i < rows.length; i++) {
			if (i === 0) continue; // Skip header row
			const row = rows.eq(i);
			if (row.find("th").length > 0) {
				// This is a section header row
				var sectionId = row.find("th").attr("id");
				if (sectionId && sectionsMap.hasOwnProperty(sectionId)) {
					//@ts-ignore
					currentSection = sectionsMap[sectionId];
				}
				continue;
			}
			const cells = row.find("td");
			if (cells.length >= 3 && currentSection !== undefined) {
				var buttonNode = cells.first().find("button").first();
				if (buttonNode.length > 0) {
					var value = buttonNode.attr("value") || "";
					const request: EHourRequest = {
						Value: value,
						Description: decodeHTMLEntities(
							buttonNode.text().trim()
						),
						Hours: cells.eq(1).text().trim(),
						Date: cells.eq(2).text().trim(),
						State: currentSection as Status,
					};

					//convert the State back to a string so we can do requestList[currentSection].push(request);
					const stateString = Status[currentSection as Status];
					//@ts-ignore
					requestList[stateString].push(request);
				} else {
					console.warn(`Row ${i} has no button, skipping`);
					continue;
				}
			} else {
				console.warn(
					`Row ${i} has unexpected number of cells or no current section: ${cells.length} cells, currentSection: ${currentSection}`
				);
				continue;
			}
		}
		return requestList;
	} catch (error) {
		console.error("Error parsing table:", error);
		throw new Error("Error parsing table");
	}
}

function decodeHTMLEntities(text: string): string {
	return cheerio.load(`<div>${text}</div>`)("div").text();
}
