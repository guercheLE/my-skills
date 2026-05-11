# SuiteCRM 8 GraphQL API — Full Reference

Discovered live against `http://crm.guerche.uk` (SuiteCRM 8, Cloudflare-proxied, Docker-hosted), May 2026.

---

## Environment Details

| Property | Value |
|---|---|
| CRM URL | `http://crm.guerche.uk` |
| SuiteCRM version | 8.x (Vue SPA frontend, Symfony backend) |
| Reverse proxy | Cloudflare (blocks `Python-urllib/` UA → 403) |
| GraphQL endpoint | `POST /api/graphql` |
| Session endpoint | `GET /session-status` |
| Login endpoint | `POST /auth/login` (JSON body) |
| Login check | `GET /auth/login` (returns current session state) |

---

## Authentication Details

### Cookie Names

| Cookie | HttpOnly | Description |
|---|---|---|
| `PHPSESSID` | Yes | PHP session — not readable by JS, sent automatically by cookie jar |
| `XSRF-TOKEN` | No | CSRF protection token — must be read and sent as `x-xsrf-token` header |

### Login Request

```
POST /auth/login
Content-Type: application/json
User-Agent: Mozilla/5.0 (...)

{"username": "admin", "password": "Comeco388Alguem!"}
```

### Login Response (200 OK)

```json
{
  "appStatus": {"installed": true, "locked": true},
  "active": true,
  "id": "1",
  "firstName": "Luciano",
  "lastName": "Evaristo Guerche",
  "userName": "admin",
  "user": "admin"
}
```

### Session Status

```
GET /session-status
User-Agent: Mozilla/5.0 (...)
```

Response when active:
```json
{"appStatus": {"installed": true, "locked": true, "loginWizardCompleted": true},
 "active": true, "id": "1", "firstName": "Luciano", "lastName": "Evaristo Guerche", "userName": "admin"}
```

Response when not active:
```json
{"appStatus": {...}, "active": false}
```

---

## GraphQL Schema (Introspected)

### Mutations

#### `saveRecord(input: saveRecordInput!)`

Universal create/update for any module.

**Input fields (`saveRecordInput`):**

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | String | No | Record UUID. Omit to create; provide to update |
| `identifier` | String | No | Alternative identifier (rarely used) |
| `module` | String | **Yes** | Module name (kebab-case or PascalCase) |
| `attributes` | Iterable | No | Key-value map of field values |
| `clientMutationId` | String | No | Passthrough correlation ID |

**Return type:**
```graphql
{
  saveRecord(input: $input) {
    record {
      _id          # bare UUID — use this
      id           # "/api/record/<uuid>" — URL path, not bare UUID
      attributes   # all saved field values
    }
    clientMutationId
  }
}
```

#### `createProcess(input: createProcessInput!)`

Triggers internal SuiteCRM processes (ACL checks, wizard steps, etc.). Not used for record CRUD.

#### Media object mutations

`createLegacyDocumentMediaObject`, `updateLegacyDocumentMediaObject`, `deleteLegacyDocumentMediaObject`, `createLegacyImageMediaObject`, `updateLegacyImageMediaObject`, `deleteLegacyImageMediaObject`, `createArchivedDocumentMediaObject`, `updateArchivedDocumentMediaObject`, `deleteArchivedDocumentMediaObject`, `createPrivateDocumentMediaObject`, `updatePrivateDocumentMediaObject`, `deletePrivateDocumentMediaObject`, `createPrivateImageMediaObject`, `updatePrivateImageMediaObject`, `deletePrivateImageMediaObject`, `createPublicDocumentMediaObject`, `updatePublicDocumentMediaObject`, `deletePublicDocumentMediaObject`, `createPublicImageMediaObject`, `updatePublicImageMediaObject`, `deletePublicImageMediaObject`

### Queries

#### `recordList`

```graphql
query recordList(
  $module: String!
  $limit: Int
  $offset: Int
  $criteria: Iterable
  $sort: Iterable
) {
  recordList(module: $module, limit: $limit, offset: $offset, criteria: $criteria, sort: $sort) {
    id       # "/api/record-list/ModuleName"
    _id      # "ModuleName"
    meta     # pagination metadata
    records  # array of record objects
  }
}
```

**Criteria structure:**
```json
{
  "filters": {
    "<field_name>": {
      "field":    "<field_name>",
      "operator": "=",
      "values":   ["<value>"]
    }
  }
}
```

Known operators: `=`, `!=`, `like`, `in`, `not_in`, `between`, `>`, `<`, `>=`, `<=`

**Sort structure:**
```json
{"sortOrder": "DESC", "orderBy": "date_modified"}
```

**Record object shape within `records` array:**
```json
{
  "id": "uuid-here",
  "module": "email-templates",
  "type": "EmailTemplate",
  "attributes": {
    "id": "uuid-here",
    "name": "...",
    "date_entered": "2026-05-10 17:53:19",
    "date_modified": "2026-05-10 17:53:19",
    "modified_user_id": "1",
    "created_by": "1",
    "deleted": false,
    "assigned_user_id": "1"
  }
}
```

---

## Module Field Reference

### EmailTemplates

| Field | Type | Notes |
|---|---|---|
| `name` | string | Template name |
| `subject` | string | Email subject line |
| `body_html` | string | HTML body (full HTML document or fragment) |
| `body` | string | Plain-text body (auto-extracted from `body_html` if not set) |
| `from_name` | string | Sender display name |
| `from_email` | string | Sender email address |
| `description` | string | Internal description |
| `published` | string | `""` or `"on"` |

### Campaigns

| Field | Type | Notes |
|---|---|---|
| `name` | string | Campaign name |
| `campaign_type` | string | `"Email"`, `"EmailMarketing"`, `"Teaser"`, etc. |
| `status` | string | `"Planning"`, `"Active"`, `"Complete"`, `"Inactive"` |
| `start_date` | string | ISO date `"YYYY-MM-DD"` |
| `end_date` | string | ISO date `"YYYY-MM-DD"` |
| `from_name` | string | |
| `from_email` | string | |
| `description` | string | |
| `content` | string | Rich text content description |

### ProspectLists

| Field | Type | Notes |
|---|---|---|
| `name` | string | List name |
| `prospect_list_type` | string | `"default"` for main recipients; `"exempt"` for unsubscribes; `"test"` for test |
| `description` | string | |

### EmailMarketing

| Field | Type | Notes |
|---|---|---|
| `name` | string | Record name |
| `start_date` | string | ISO date for send |
| `from_name` | string | |
| `from_email` | string | |
| `status` | string | `"Pending"`, `"Active"`, `"Complete"` |
| `campaign_id` | string | UUID of parent Campaign |
| `stationery_id` | string | UUID of EmailTemplate — this is how EmailMarketing links to a template |

### AOW_WorkFlow

| Field | Type | Notes |
|---|---|---|
| `name` | string | |
| `status` | string | `"Active"`, `"Inactive"` |
| `run_when` | string | `"Always"` (fires on every save, safe for re-subscription), `"Only On Save"`, `"Always On Save"` |
| `base_module` | string | Module that triggers the workflow, e.g. `"Leads"` |
| `description` | string | |

### AOW_Conditions

| Field | Type | Notes |
|---|---|---|
| `name` | string | |
| `aow_workflow_id` | string | Parent workflow UUID |
| `field` | string | Field name to check |
| `operator` | string | `"Equal"`, `"Not Equal"`, `"Greater Than"`, etc. |
| `value` | string | Comparison value |
| `field_type` | string | `"TextField"`, `"CheckBox"`, `"DropDown"`, etc. |

### AOW_Actions

| Field | Type | Notes |
|---|---|---|
| `name` | string | |
| `aow_workflow_id` | string | Parent workflow UUID |
| `action_type` | string | `"Create Relationship"`, `"Modify Record"`, `"Send Email"`, etc. |
| `parameters` | string | JSON-encoded parameters object |

### AOS_Products

| Field | Type | Notes |
|---|---|---|
| `name` | string | Product name |
| `description` | string | |
| `currency_id` | string | `"-99"` for system default currency |
| `price` | string | Decimal string, e.g. `"59.99"` |
| `cost` | string | Decimal string |
| `status` | string | `"Active"`, `"Inactive"` |

---

## Complete Python Client

```python
#!/usr/bin/env python3
"""
Minimal SuiteCRM 8 GraphQL client for Python (stdlib only).
"""
from __future__ import annotations
import http.cookiejar
import json
import urllib.request
import urllib.parse


class SuiteCRMGraphQL:
    """
    Cookie-session GraphQL client for SuiteCRM 8.

    Usage:
        client = SuiteCRMGraphQL("http://crm.guerche.uk")
        client.login("admin", "password")
        record_id = client.upsert("email-templates", {"name": "My Template", ...})
    """

    _UA = "Mozilla/5.0 (compatible; SuiteCRMClient/1.0)"

    def __init__(self, base_url: str):
        self.base_url    = base_url.rstrip("/")
        self._xsrf_token = ""
        self._jar        = http.cookiejar.CookieJar()
        self._opener     = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self._jar)
        )

    # ── Auth ──────────────────────────────────────────────────────────────────

    def login(self, username: str, password: str) -> None:
        """Authenticate and store session cookies."""
        # GET / seeds XSRF-TOKEN cookie (SuiteCRM SPA entry point)
        self._get("/")
        self._xsrf_token = self._get_xsrf()

        # Authenticate
        body = json.dumps({"username": username, "password": password}).encode()
        req  = urllib.request.Request(f"{self.base_url}/auth/login", data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("x-xsrf-token", self._xsrf_token)
        req.add_header("User-Agent",   self._UA)
        resp = self._opener.open(req, timeout=20)
        data = json.loads(resp.read())
        if not data.get("active"):
            raise RuntimeError(f"Login failed: {data}")

        # Refresh XSRF token (may rotate after login)
        new_xsrf = self._get_xsrf()
        if new_xsrf:
            self._xsrf_token = new_xsrf

    def is_active(self) -> bool:
        """Check if the current session is still valid."""
        data = json.loads(self._get("/session-status").read())
        return bool(data.get("active"))

    # ── GraphQL ───────────────────────────────────────────────────────────────

    def query(self, gql_query: str, variables: dict | None = None,
              operation_name: str | None = None) -> dict:
        """Execute a GraphQL query/mutation. Returns data dict."""
        payload: dict = {"query": gql_query}
        if variables:
            payload["variables"] = variables
        if operation_name:
            payload["operationName"] = operation_name

        body = json.dumps(payload).encode()
        req  = urllib.request.Request(f"{self.base_url}/api/graphql", data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("x-xsrf-token", self._xsrf_token)
        req.add_header("User-Agent",   self._UA)

        try:
            resp   = self._opener.open(req, timeout=30)
            result = json.loads(resp.read())
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode(errors="replace")
            raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc

        if "errors" in result:
            raise RuntimeError(f"GraphQL errors: {result['errors']}")
        return result["data"]

    # ── High-level helpers ────────────────────────────────────────────────────

    _SAVE_MUTATION = """
        mutation saveRecord($input: saveRecordInput!) {
          saveRecord(input: $input) {
            record { _id id attributes }
            clientMutationId
          }
        }
    """

    _LIST_QUERY = """
        query recordList($module: String!, $limit: Int, $offset: Int, $criteria: Iterable) {
          recordList(module: $module, limit: $limit, offset: $offset, criteria: $criteria) {
            _id records meta
          }
        }
    """

    def save(self, module: str, attributes: dict,
             record_id: str | None = None) -> str:
        """
        Create or update a record. Returns the record UUID.
        Pass record_id to update an existing record.
        """
        inp: dict = {"module": module, "attributes": attributes}
        if record_id:
            inp["_id"] = record_id
        data = self.query(self._SAVE_MUTATION, variables={"input": inp})
        return data["saveRecord"]["record"]["_id"]

    def search_by_name(self, module: str, name: str) -> str | None:
        """Return the UUID of the first record matching name, or None."""
        data = self.query(self._LIST_QUERY, variables={
            "module":   module,
            "limit":    1,
            "offset":   0,
            "criteria": {
                "filters": {
                    "name": {"field": "name", "operator": "=", "values": [name]}
                }
            },
        })
        records = data["recordList"]["records"]
        return records[0]["id"] if records else None

    def upsert(self, module: str, attributes: dict) -> tuple[str, bool]:
        """
        Idempotently create or update by name.
        Returns (uuid, was_created: bool).
        Always updates existing records so HTML/content changes propagate on re-run.
        """
        existing_id = self.search_by_name(module, attributes["name"])
        if existing_id:
            uuid = self.save(module, attributes, record_id=existing_id)
            return uuid, False
        uuid = self.save(module, attributes)
        return uuid, True

    def list_records(self, module: str, limit: int = 20, offset: int = 0,
                     criteria: dict | None = None) -> list[dict]:
        """Return raw record dicts from recordList."""
        data = self.query(self._LIST_QUERY, variables={
            "module":   module,
            "limit":    limit,
            "offset":   offset,
            "criteria": criteria or {},
        })
        return data["recordList"]["records"]

    # ── Internal ──────────────────────────────────────────────────────────────

    def _get(self, path: str):
        req = urllib.request.Request(f"{self.base_url}{path}")
        req.add_header("User-Agent", self._UA)
        return self._opener.open(req, timeout=20)

    def _get_xsrf(self) -> str:
        for cookie in self._jar:
            if cookie.name == "XSRF-TOKEN":
                return cookie.value
        return ""
```

---

## Network Topology Notes

- **Cloudflare** sits in front of `crm.guerche.uk`
  - Blocks requests with `User-Agent: Python-urllib/3.x` with HTTP 403 and error code 1010
  - Passes through any browser-like User-Agent string
  - `cf-ray` header visible in responses confirms Cloudflare presence
- **Docker** hosts SuiteCRM on a local server at `192.168.31.254`
  - SSH on port 22 times out from the Mac (firewall or different port)
  - Domain `crm.guerche.uk` routes through Cloudflare to the Docker container
- **HTTPS** works (`https://crm.guerche.uk`) — `/service/v4_1/rest.php` is accessible on both HTTP and HTTPS

---

## Known Working Endpoints (verified)

| Endpoint | Method | Status | Purpose |
|---|---|---|---|
| `/auth/login` | GET | 200 | Returns session state + seeds XSRF cookie |
| `/auth/login` | POST (JSON) | 200 | Authenticate user |
| `/session-status` | GET | 200 | Check if session is active |
| `/api/graphql` | POST (JSON) | 200 | All GraphQL operations |
| `/service/v4_1/rest.php` | POST (form) | 200 (auth fails) | Legacy REST — endpoint reachable but login broken |

## Known Dead Endpoints

| Endpoint | Status | Notes |
|---|---|---|
| `/api/v8/` | 404 | v8 JSON:API not configured |
| `/api/v8/access_token` | 404 | |
| `/api/access_token` | 404 | |
| `/legacy/api/v8/access_token` | 401 | Exists but requires Basic Auth; even with Basic Auth returns "JWT must have two dots" |
| `/index.php` | 500 | SPA entry point is dead |
| `/index.php?entryPoint=SugarRestEntry` | 301 → 403 | Redirect loop |

---

## Credentials Location

Credentials are stored in `scripts/.suitecrm_credentials` (git-ignored):

```json
{
  "url": "http://crm.guerche.uk",
  "username": "admin",
  "password": "...",
  "oauth_client_id": "792105da-a618-49ba-902c-05efa4863a56",
  "oauth_client_secret": "MztSync@2026!"
}
```

The `oauth_client_id` and `oauth_client_secret` are **not used** by the GraphQL API (that OAuth2 client is for the non-functional v8 JSON:API). They are kept for reference only.

---

## Live-Verified Test Record

An `EmailTemplate` named `__TEST_DELETE_ME__` was created during API verification:
- **ID**: `a15247e0-ccef-47ce-a2c5-46a54ca5af7b`
- **Module**: `email-templates`
- Delete via: `saveRecord` with `_id` and `attributes: {deleted: true}` or through the SuiteCRM UI
