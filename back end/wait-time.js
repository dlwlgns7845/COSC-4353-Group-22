
const PRIORITY_RANK = {
  high: 0,
  medium: 1,
  low: 2
};

function calculateWaitTime(queueEntries, service, entryId) {
  // Validate the inputs.
  if (!Array.isArray(queueEntries)) {
    throw new TypeError("Queue entries must be an array");
  }

  if (!service || typeof service.duration !== "number" ||
      !Number.isFinite(service.duration) || service.duration <= 0) {
    throw new RangeError("Service duration must be a positive number");
  }

  if (!Number.isInteger(entryId) || entryId <= 0) {
    throw new TypeError("Queue entry ID must be a positive integer");
  }

  // Only include waiting users for the requested service.
  const waiting = queueEntries
    .filter(entry =>
      entry.serviceId === service.id && entry.status === "waiting"
    )
    .sort((a, b) => {
      // Higher-priority customers go first.
      const priorityA = PRIORITY_RANK[a.priority] ?? PRIORITY_RANK.medium;
      const priorityB = PRIORITY_RANK[b.priority] ?? PRIORITY_RANK.medium;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Earlier arrivals go first when priorities match.
      const arrivalDifference =
        new Date(a.joinedAt) - new Date(b.joinedAt);

      return arrivalDifference || a.id - b.id;
    });

  const index = waiting.findIndex(entry => entry.id === entryId);

  if (index === -1) {
    return null;
  }

  return {
    entryId,
    serviceId: service.id,
    position: index + 1,
    peopleAhead: index,
    estimatedWaitMinutes: index * service.duration
  };
}

module.exports = { calculateWaitTime };
