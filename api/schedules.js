import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  // GET 요청: 모든 일정 데이터 가져오기
  if (req.method === "GET") {
    try {
      const { rows } = await sql`SELECT * FROM schedules;`;

      // 클라이언트에서 사용하기 편한 { 'YYYY-MM-DD': { ... } } 형태로 변환
      const scheduleData = rows.reduce((acc, row) => {
        // Vercel Postgres는 날짜를 ISO 문자열로 반환 (예: 2025-09-01T00:00:00.000Z)
        // 'YYYY-MM-DD' 형식으로 자르기
        const formattedDate = row.date.toISOString().split("T")[0];
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

  // POST 요청: 특정 날짜의 일정 저장/수정/삭제
  if (req.method === "POST") {
    try {
      const { date, events, memo } = req.body;

      // 해당 날짜에 이벤트나 메모가 없으면 데이터 삭제
      if (events.length === 0 && !memo) {
        await sql`DELETE FROM schedules WHERE date = ${date};`;
        return res
          .status(200)
          .json({ message: "Schedule deleted successfully" });
      }

      // 데이터가 있으면 추가 또는 수정 (UPSERT)
      await sql`
        INSERT INTO schedules (date, events, memo)
        VALUES (${date}, ${events}, ${memo})
        ON CONFLICT (date) DO UPDATE
        SET events = EXCLUDED.events, memo = EXCLUDED.memo;
      `;

      return res.status(200).json({ message: "Schedule saved successfully" });
    } catch (error) {
      console.error("Failed to save schedule:", error);
      return res.status(500).json({ error: "Failed to save schedule" });
    }
  }

  // 허용되지 않은 메소드
  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
