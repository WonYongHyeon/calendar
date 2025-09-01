import { sql } from "@vercel/postgres";
export default async function handler(req, res) {
  // GET 요청
  if (req.method === "GET") {
    try {
      const { rows } = await sql`SELECT * FROM schedules;`;

      const scheduleData = rows.reduce((acc, row) => {
        const formattedDate =
          row.date instanceof Date
            ? `${row.date.getFullYear()}-${String(
                row.date.getMonth() + 1
              ).padStart(2, "0")}-${String(row.date.getDate()).padStart(
                2,
                "0"
              )}`
            : row.date;

        acc[formattedDate] = {
          events: row.events || [],
          memo: row.memo || "",
        };
        return acc;
      }, {});

      return res.status(200).json(scheduleData);
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
      return res.status(500).json({ error: "Failed to fetch schedules" });
    }
  }

  // POST 요청
  if (req.method === "POST") {
    try {
      const { date, events, memo } = req.body;

      if (events.length === 0 && !memo) {
        await sql`DELETE FROM schedules WHERE date = ${date};`;
        return res
          .status(200)
          .json({ message: "Schedule deleted successfully" });
      }

      await sql`
        INSERT INTO schedules (date, events, memo)
        VALUES (${date}, ${JSON.stringify(events)}, ${memo})
        ON CONFLICT (date) DO UPDATE
        SET events = EXCLUDED.events, memo = EXCLUDED.memo;
      `;

      return res.status(200).json({ message: "Schedule saved successfully" });
    } catch (error) {
      console.error("Failed to save schedule:", error);
      return res.status(500).json({ error: "Failed to save schedule" });
    }
  }
}
