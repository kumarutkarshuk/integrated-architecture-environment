function readNavigatorMobile(nav: Navigator): boolean | undefined {
  const data = (
    nav as Navigator & { userAgentData?: { mobile?: boolean } }
  ).userAgentData;
  return data?.mobile;
}

export function isWebMcpCompatibleBrowser(
  info: {
    userAgent: string;
    vendor?: string;
    mobile?: boolean;
  } = typeof navigator === "undefined"
    ? { userAgent: "" }
    : {
        userAgent: navigator.userAgent,
        vendor: navigator.vendor,
        mobile: readNavigatorMobile(navigator),
      },
): boolean {
  if (info.mobile) {
    return false;
  }

  if (/Mobi|Android|iPhone|iPad|iPod/i.test(info.userAgent)) {
    return false;
  }

  if (/Firefox\//i.test(info.userAgent)) {
    return false;
  }

  return /Chrome\/|Chromium\/|Edg\//i.test(info.userAgent);
}
