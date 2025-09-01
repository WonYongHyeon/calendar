import { sql } from "@vercel/postgres";

// CORS 설정을 위한 함수
const allowCors = (fn) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*"); // 모든 도메인 허용
  // 또는 특정 도메인만 허용: 'https://haevelyn-schedule.vercel.app'
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

const handler = async (req, res) => {
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

  if (req.method === "POST") {
    try {
      const { date, events, memo } = req.body;

      // 1. 데이터베이스에서 해당 날짜의 기존 데이터를 조회합니다.
      const { rows } = await sql`
        SELECT events, memo FROM schedules WHERE date = ${date};
      `;

      let mergedEvents = events;
      let mergedMemo = memo;

      if (rows.length > 0) {
        const existingData = rows[0];
        const existingEvents = existingData.events || [];
        const existingMemo = existingData.memo || "";

        // 2. 새로운 이벤트만 필터링하여 기존 이벤트에 병합합니다.
        // 현재 로직은 완전히 동일한 이벤트가 중복되는 것을 방지합니다.
        const newEventsOnly = events.filter(
          (newEvent) =>
            !existingEvents.some(
              (existingEvent) => existingEvent.text === newEvent.text
            )
        );
        mergedEvents = [...existingEvents, ...newEventsOnly];

        // 3. 메모를 병합합니다 (새로운 메모가 있을 경우 기존 메모에 덮어씁니다).
        // 메모는 가장 최신 데이터로 유지하는 것이 자연스럽습니다.
        if (memo && memo.trim()) {
          mergedMemo = memo;
        } else {
          mergedMemo = existingMemo;
        }
      }

      if (mergedEvents.length === 0 && !mergedMemo.trim()) {
        await sql`DELETE FROM schedules WHERE date = ${date};`;
        return res
          .status(200)
          .json({ message: "Schedule deleted successfully" });
      }

      // 4. 병합된 데이터를 데이터베이스에 저장합니다.
      await sql`
        INSERT INTO schedules (date, events, memo)
        VALUES (${date}, ${JSON.stringify(mergedEvents)}, ${mergedMemo})
        ON CONFLICT (date) DO UPDATE
        SET events = EXCLUDED.events, memo = EXCLUDED.memo;
      `;

      return res.status(200).json({ message: "Schedule saved successfully" });
    } catch (error) {
      console.error("Failed to save schedule:", error);
      return res.status(500).json({ error: "Failed to save schedule" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};

// CORS를 적용한 핸들러 함수를 export
export default allowCors(handler);
