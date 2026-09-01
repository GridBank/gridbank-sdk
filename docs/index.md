# GridBank APIs

GridBank has two APIs. They serve different audiences, take different credentials, and
neither is built on the other. Pick the one that matches how you get your content.

## Partner API

**Your own library** — the clips your GridBank account has already licensed. Keys are
self-service from your account settings.

- List what you have licensed, newest purchase first
- Issue a signed download URL for any clip you own
- 300 requests per minute per key

[Read the Partner API docs](partner/index.md){ .md-button .md-button--primary }

## Enterprise API

**Leased collections** on an enterprise contract — search the GridBank catalogue and
download from the collection your contract covers. Keys are issued during onboarding.

- Full-text search across the catalogue
- Video metadata, signed downloads, usage and quota
- Rate limits and quota by contract tier

[Read the Enterprise API docs](enterprise/index.md){ .md-button }

## Which one am I using?

| | Partner API | Enterprise API |
|---|---|---|
| Content | What your account licensed | What your contract leases |
| Base path | `/partner/v1` | `/external/v1` |
| Get a key | Account settings on gridbank.io | Issued by GridBank during onboarding |
| SDK client | `PartnerClient` | `EnterpriseClient` |

Both clients ship in the same packages — `gridbank-api` on PyPI, `@gridbank/api-js` on
npm — so installing once gives you either.

## Support

**Email:** [hello@gridbank.io](mailto:hello@gridbank.io)
