# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Report it privately through GitHub: open the repository's **Security** tab and choose
**Report a vulnerability**. The report is visible only to the maintainers until an advisory is
published.

What counts here is a skill whose advice makes an application insecure when followed: a pattern
that leaks one caller's data to another, skips an authorization check, or exposes a secret. A useful
report says:

- the skill and the plugin version (`pragmatic-use-caching`, `pragmatic-design` 0.11.29);
- the advice, and what an attacker can do in an application that follows it;
- the smallest code that shows it.

A vulnerability in the packages themselves goes to their repository:
[Pragmatic.Design](https://github.com/pragmatic-design/Pragmatic.Design/security/advisories/new) or
[PDX UI](https://github.com/pragmatic-design/pdxui/security/advisories/new).

## What to expect

We acknowledge a report, confirm or dismiss it, and agree a disclosure date with you. A confirmed
problem is fixed in the skill's source repository, copied here in a new plugin version, and
published as a GitHub security advisory that credits you, unless you prefer otherwise.

## Supported versions

Only the latest version of each plugin receives fixes.
