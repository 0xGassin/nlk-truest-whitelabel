const DETAIL_LABEL_ACRONYMS = new Set([
  "api",
  "asn",
  "caa",
  "cname",
  "cors",
  "cvss",
  "csp",
  "css",
  "ct",
  "dkim",
  "dmarc",
  "dns",
  "ftp",
  "geoip",
  "graphql",
  "html",
  "hsts",
  "http",
  "https",
  "id",
  "ip",
  "ipv4",
  "ipv6",
  "json",
  "jwt",
  "mx",
  "nvd",
  "ns",
  "oauth",
  "ptr",
  "rdp",
  "saml",
  "san",
  "smtp",
  "spf",
  "sql",
  "ssh",
  "ssl",
  "tcp",
  "tls",
  "txt",
  "uri",
  "url",
  "uuid",
  "whois",
  "xml",
  "xss",
]);

export function formatDetailLabel(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const normalizedWord = word.toLowerCase();
      const acronym = normalizedWord.endsWith("s") ? normalizedWord.slice(0, -1) : normalizedWord;
      if (DETAIL_LABEL_ACRONYMS.has(normalizedWord)) return normalizedWord.toUpperCase();
      if (DETAIL_LABEL_ACRONYMS.has(acronym))
        return `${acronym.toUpperCase()}${normalizedWord.endsWith("s") ? "s" : ""}`;
      return `${normalizedWord.charAt(0).toUpperCase()}${normalizedWord.slice(1)}`;
    })
    .join(" ");
}
