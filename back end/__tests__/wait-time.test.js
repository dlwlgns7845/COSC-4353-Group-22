
const { calculateWaitTime } = require("../wait-time");

const service = { id: 1, duration: 15 };

const entries = [
  {
    id: 1, serviceId: 1, status: "waiting",
    priority: "medium", joinedAt: "2026-10-23T10:00:00Z"
  },
  {
    id: 2, serviceId: 1, status: "waiting",
    priority: "medium", joinedAt: "2026-10-23T10:05:00Z"
  },
  {
    id: 3, serviceId: 2, status: "waiting",
    priority: "high", joinedAt: "2026-10-23T09:00:00Z"
  }
];

describe("Wait-Time Estimation", () => {
  test("first customer waits zero minutes", () => {
    const result = calculateWaitTime(entries, service, 1);
    expect(result.estimatedWaitMinutes).toBe(0);
    expect(result.position).toBe(1);
  });

  test("second customer waits 15 minutes", () => {
    const result = calculateWaitTime(entries, service, 2);
    expect(result.estimatedWaitMinutes).toBe(15);
    expect(result.position).toBe(2);
  });

  test("customers in other services are excluded", () => {
    const result = calculateWaitTime(entries, service, 2);
    expect(result.peopleAhead).toBe(1);
  });

  test("higher-priority customers move ahead", () => {
    const updated = [
      ...entries,
      {
        id: 4, serviceId: 1, status: "waiting",
        priority: "high", joinedAt: "2026-10-23T10:10:00Z"
      }
    ];
    const result = calculateWaitTime(updated, service, 2);
    expect(result.position).toBe(3);
    expect(result.estimatedWaitMinutes).toBe(30);
  });

  test("unknown queue entry returns null", () => {
    expect(calculateWaitTime(entries, service, 999)).toBeNull();
  });

  test("invalid service duration is rejected", () => {
    expect(() =>
      calculateWaitTime(entries, { id: 1, duration: -5 }, 1)
    ).toThrow(RangeError);
  });
});
