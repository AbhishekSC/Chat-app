// Helper fucntion to format message timestamp
export const formatMessageTime = (timestamp) => {
  const messageDate = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now - messageDate) / (1000 * 60 * 60);

  // If message is older than 24 hours
  if (diffInHours > 24) {
    // For previous year messages
    if (messageDate.getFullYear() < now.getFullYear()) {
      return messageDate.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    // For same year but older than 24 hours
    return messageDate.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });
  }

  // For messages within 24 hours
  return messageDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};
