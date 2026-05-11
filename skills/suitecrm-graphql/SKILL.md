---
name: suitecrm-graphql
description: This skill should be used when the user asks to "interact with SuiteCRM", "call the SuiteCRM API", "sync data to SuiteCRM", "create records in SuiteCRM", "query SuiteCRM", "update SuiteCRM campaigns", "use SuiteCRM GraphQL", "write a SuiteCRM script", or needs to automate any SuiteCRM 8 operation from Python or the browser. Covers the GraphQL API, authentication, record CRUD, relationship management, and all known gotchas.
version: 1.0.0
---

# SuiteCRM 8 — GraphQL API

SuiteCRM 8 exposes a **GraphQL API** at `/api/graphql`. This is the only working programmatic API for SuiteCRM 8 instances. All other API paths (v8 JSON:API, legacy v4_1 login) either 404 or reject credentials. See [references/api-reference.md](references/api-reference.md) for full schema details.

---

## Critical Gotchas (Read First)

| Symptom | Root Cause | Fix |
|---|---|---|
| `403 Forbidden` from Python | Cloudflare blocks `Python-urllib/` User-Agent | Set `User-Agent: Mozilla/5.0 (compatible; ...)` on every request |
| `/api/v8/access_token` → 404 | v8 JSON:API not routed | Use `/api/graphql` instead |
| `/legacy/api/v8/access_token` → 401 "Missing Authorization header" | Correct endpoint, but requires Basic Auth header | Use cookie+XSRF login instead (simpler) |
| HTML payload mangled in `EmailTemplates` | V8 / GraphQL sanitizes and truncates HTML structural wrappers | Fallback to Legacy **V4_1 REST API** `set_entry` for HTML payloads |
| `index.php` → 500 | SuiteCRM 8 SPA — `index.php` is not a valid entry point | Ignore; `index.php` is dead |
| `record.id` is a URL path | `record.id = "/api/record/<uuid>"` | Always use `record._id` for the UUID |
| `__schema` introspection → 500 | Some introspection queries cause server errors | Use specific `__type(name:...)` queries instead |

---



## Legacy V4_1 REST API (Emergency Fallback)

For modules where the GraphQL/V8 API destroys payloads (like `EmailTemplates` with full HTML wrappers, or `EmailMarketing` relationships that fail in V8), you **must** use the legacy V4 API.

**Endpoint Setup:**
- URL: `https://<domain>/legacy/service/v4_1/rest.php`
- Payload: `method=<method_name>&input_type=JSON&response_type=JSON&rest_data=<json_string>`

**Auth (`login`):**
Pass the password explicitly as MD5.
```python
rest_data = {
    "user_auth": {
        "user_name": "admin",
        "password": hashlib.md5("password".encode()).hexdigest()
    }
}
```

**Upsert (`set_entry`):**
Use to safely push raw HTML into `EmailTemplates.body_html` without the V8 HTML sanitization destroying layout wrapper elements.

## Authentication (Python)

SuiteCRM 8 uses **cookie session + XSRF token**. No OAuth2, no Bearer token.

### Step-by-step flow

```python
import json, urllib.request, urllib.parse, http.cookiejar

BASE = "http://crm.guerche.digital"
UA   = "Mozilla/5.0 (compatible; MyScript/1.0)"

# 1. Create a cookie jar — handles PHPSESSID + XSRF-TOKEN automatically
jar     = http.cookiejar.CookieJar()
opener  = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

# 2. GET / to seed the XSRF-TOKEN + SCRMSESSID cookies (SPA entry point)
req = urllib.request.Request(f"{BASE}/")
req.add_header("User-Agent", UA)
opener.open(req)

# 3. Extract XSRF-TOKEN value from the cookie jar
xsrf_token = next(c.value for c in jar if c.name == "XSRF-TOKEN")

# 4. POST /auth/login with JSON credentials + XSRF header
body = json.dumps({"username": "admin", "password": "..."}).encode()
req  = urllib.request.Request(f"{BASE}/auth/login", data=body, method="POST")
req.add_header("Content-Type", "application/json")
req.add_header("x-xsrf-token", xsrf_token)
req.add_header("User-Agent", UA)
resp = opener.open(req)
data = json.loads(resp.read())
assert data.get("active"), f"Login failed: {data}"

# 5. Refresh XSRF token (server may rotate it on login)
xsrf_token = next(c.value for c in jar if c.name == "XSRF-TOKEN")
```

### Making a GraphQL call

```python
def gql(query: str, variables: dict = None) -> dict:
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    body = json.dumps(payload).encode()
    req  = urllib.request.Request(f"{BASE}/api/graphql", data=body, method="POST")
    req.add_header("Content-Type",  "application/json")
    req.add_header("x-xsrf-token",  xsrf_token)
    req.add_header("User-Agent",    UA)
    # opener (with cookie jar) must be used — not urllib.request.urlopen
    resp = opener.open(req, timeout=30)
    result = json.loads(resp.read())
    if "errors" in result:
        raise RuntimeError(f"GraphQL error: {result['errors']}")
    return result["data"]
```

### Session check

```python
req = urllib.request.Request(f"{BASE}/session-status")
req.add_header("User-Agent", UA)
status = json.loads(opener.open(req).read())
# {"active": true, "id": "1", "userName": "admin", "firstName": "...", "lastName": "..."}
```

---

## Core Operations

### Create a record (`saveRecord`)

```python
data = gql(
    """
    mutation saveRecord($input: saveRecordInput!) {
      saveRecord(input: $input) {
        record { _id attributes }
        clientMutationId
      }
    }
    """,
    variables={
        "input": {
            "module": "email-templates",   # see Module Names below
            "attributes": {
                "name":      "My Template",
                "subject":   "Hello {nome}",
                "body_html": "<p>Content</p>",
                "from_name": "Sender Name",
                "from_email": "sender@example.com",
            }
        }
    }
)
record_id = data["saveRecord"]["record"]["_id"]   # UUID — use _id, NOT id
```

### Update a record (same mutation, add `_id`)

```python
data = gql(
    """mutation saveRecord($input: saveRecordInput!) {
         saveRecord(input: $input) { record { _id attributes } }
       }""",
    variables={
        "input": {
            "_id":    "existing-uuid-here",
            "module": "email-templates",
            "attributes": {"subject": "Updated Subject"}
        }
    }
)
```

### Search records by name (`recordList`)

```python
data = gql(
    """
    query recordList($module: String!, $limit: Int, $offset: Int, $criteria: Iterable) {
      recordList(module: $module, limit: $limit, offset: $offset, criteria: $criteria) {
        _id
        records
      }
    }
    """,
    variables={
        "module":   "email-templates",
        "limit":    1,
        "offset":   0,
        "criteria": {
            "filters": {
                "name": {"field": "name", "operator": "=", "values": ["My Template"]}
            }
        }
    }
)
records = data["recordList"]["records"]   # list of record dicts
if records:
    record_id = records[0]["id"]          # here "id" is the UUID (not _id path)
```

### Idempotent upsert pattern

```python
def upsert(module: str, attributes: dict) -> str:
    """Returns the record UUID; creates or updates by name."""
    # Search
    search_data = gql(RECORD_LIST_QUERY, variables={
        "module": module, "limit": 1, "offset": 0,
        "criteria": {"filters": {"name": {"field": "name", "operator": "=", "values": [attributes["name"]]}}}
    })
    existing = search_data["recordList"]["records"]
    
    inp = {"module": module, "attributes": attributes}
    if existing:
        inp["_id"] = existing[0]["id"]
    
    result = gql(SAVE_RECORD_MUTATION, variables={"input": inp})
    return result["saveRecord"]["record"]["_id"]
```

---

## Module Names

All module names below are accepted in both kebab-case and PascalCase:

| Module | kebab-case | PascalCase |
|---|---|---|
| Email Templates | `email-templates` | `EmailTemplates` |
| Campaigns | `campaigns` | `Campaigns` |
| Prospect Lists | `prospect-lists` | `ProspectLists` |
| Email Marketing | `email-marketing` | `EmailMarketing` |
| Products (AOS) | `aos-products` | `AOS_Products` |
| Workflows | `aow-workflow` | `AOW_WorkFlow` |
| Leads | `leads` | `Leads` |

---

## Key Field Notes

| Module | Important Fields |
|---|---|
| `EmailTemplates` | `name`, `subject`, `body_html`, `body` (plain text auto-extracted), `from_name`, `from_email` |
| `Campaigns` | `name`, `campaign_type` (`"Email"`), `status` (`"Planning"`/`"Active"`), `start_date`, `end_date`, `from_name`, `from_email` |
| `ProspectLists` | `name`, `prospect_list_type` (`"default"`), `description` |
| `EmailMarketing` | `name`, `start_date` (ISO), `from_name`, `from_email`, `status` (`"Pending"`), `campaign_id`, `stationery_id` (links to EmailTemplate UUID) |
| `AOW_WorkFlow` | `name`, `status` (`"Active"`), `run_when` (`"Always"` for re-subscription safety), `base_module` (`"Leads"`) |

---

## Response Shape

`saveRecord` returns:
```json
{
  "saveRecord": {
    "record": {
      "_id": "uuid-here",
      "id": "/api/record/uuid-here",   ← URL path, NOT a bare UUID
      "attributes": { "id": "uuid-here", "name": "...", ... }
    }
  }
}
```

`recordList` returns:
```json
{
  "recordList": {
    "_id": "ModuleName",
    "id": "/api/record-list/ModuleName",
    "records": [
      {
        "id": "uuid-here",             ← bare UUID in recordList records
        "module": "email-templates",
        "attributes": { ... }
      }
    ]
  }
}
```

**Rule**: In `saveRecord` response use `record._id`. In `recordList` response use `records[n]["id"]`.

---

## Available Mutations

- `saveRecord(input: saveRecordInput!)` — universal create/update for all modules
- `createProcess(input: createProcessInput!)` — trigger internal SuiteCRM processes (ACL, etc.)
- `createLegacyDocumentMediaObject`, `updateLegacyDocumentMediaObject`, etc. — file uploads

---

## What Does NOT Work

- `GET /api/v8/` → 404 (v8 JSON:API not configured)
- `POST /api/v8/access_token` → 404
- `POST /legacy/api/v8/access_token` → 401 without Basic Auth; 401 "JWT must have two dots" with Basic Auth
- NOTE: V4_1 REST API `login` ACTUALLY WORKS if you use `/legacy/service/v4_1/rest.php` and encode `password` with `hashlib.md5(pwd.encode()).hexdigest()`
- `POST /index.php?action=Authenticate` → 500 (SPA entry point is dead)
- Introspection `{ __schema { queryType { ... } } }` → 500 server error

---

## Reference Files

- [references/api-reference.md](references/api-reference.md) — Full GraphQL schema, all `saveRecordInput` fields, criteria operators, sort options, and complete Python client class
