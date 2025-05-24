export const formatMessageTime = (timestamp) => {
  const messageDate = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);

  // Just now (less than 1 minute)
  if (diffInMinutes < 1) {
    return "just now";
  }

  // Less than 60 minutes
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  // Less than 24 hours
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  // If message is older than 24 hours
  if (diffInHours >= 24) {
    // For previous years
    if (messageDate.getFullYear() < now.getFullYear()) {
      return messageDate.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    // For same year but older messages
    return messageDate.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });
  }

  // Fallback to time format
  return messageDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// Keep the seen message format as is
export function formatMessageTimeForSeen(timestamp) {
  const messageDate = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);

  // Just now (less than 1 minute)
  if (diffInMinutes < 1) {
    return "just now";
  }

  // Less than 60 minutes
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  // Less than 24 hours
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  // If message is older than 24 hours
  // if (diffInHours >= 24) {
  //   // For previous years
  //   if (messageDate.getFullYear() < now.getFullYear()) {
  //     return `on ${messageDate.toLocaleDateString("en-US", {
  //       day: "numeric",
  //       month: "short",
  //       year: "numeric",
  //     })}`;
  //   }
  //   // For same year but older messages
  //   return `on ${messageDate.toLocaleDateString("en-US", {
  //     day: "numeric",
  //     month: "short",
  //   })}`;
  // }

  // Fallback to time format
  return `at ${messageDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;
}
