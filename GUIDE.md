# IPAM Platform — User Guide

A complete walkthrough of what the platform is, how each page works, and what to do (and what *not* to expect) when you use it.

---

## 1. What this platform is

The IPAM (IP Address Management) platform is an internal tool for tracking and governing the IP address space of a telecom network. Rather than scattering allocations across spreadsheets, sticky notes, and tribal knowledge, every block, subnet, VLAN, site, and individual host address lives in one structured database with a web UI on top.

It models the network the way operators actually think about it:

```
Network Domain (IPRAN / MPBN / VRF)
 └─ Root Block (e.g. 10.0.0.0/8 - your owned address space)
     └─ Subnet  (e.g. 10.5.0.0/16 - carved for a region or service)
         └─ Subnet  (e.g. 10.5.1.0/24 - nested deeper)
             └─ IP Address  (e.g. 10.5.1.42, assigned to a specific device)
```

Around that hierarchy sit physical and logical asset registries (sites, VLANs, devices) and operational workflows (requests, approvals, audit logs, dashboards).

**Who it is for:** network engineers and team leads who allocate IP space, plus managers who approve requests and read capacity reports.

**What it replaces:** the "IP planning sheet" that everyone in a telecom ops team has and nobody trusts.

---

## 2. Getting started

### 2.1 Sign in

Open **[https://localhost](https://localhost)** in your browser. Accept the self-signed certificate warning (development only; in production, this would be a real cert).

Default credentials seeded on first boot:

| Field    | Value                |
|----------|----------------------|
| Email    | `admin@ipam.local`   |
| Password | `admin123`           |

The admin user has full access. There is no self-service signup. Additional users can only be added through the database today.

### 2.2 The layout

Once logged in you see three regions:

- **Left sidebar** — three navigation groups (Management, Operations, Admin) plus the user menu at the bottom. Click the chevron above the user menu to collapse the sidebar to icons only.
- **Top header** — page title and a "System Healthy" indicator.
- **Main canvas** — the active page.

### 2.3 Concepts to know before you start

| Term              | Meaning                                                                                              |
|-------------------|------------------------------------------------------------------------------------------------------|
| **Root Block**    | The largest CIDR you own and want to manage (e.g. `10.0.0.0/8`). Everything sits under one.          |
| **Subnet**        | A CIDR carved from a block, possibly nested several layers deep.                                     |
| **IP Address**    | A specific host address assigned within a subnet, optionally linked to a device.                     |
| **Network Domain**| A logical separation, typically a VRF (`vrf-ipran`, `vrf-mpbn`). Multiple blocks can share a domain. |
| **Site**          | A physical location (city, POP, datacenter).                                                         |
| **VLAN**          | An 802.1Q tag (1 to 4094), optionally bound to a site and a domain.                                  |
| **Device**        | A router, switch, or firewall. Has a hostname, role, optional site, optional management IP.          |
| **Request**       | A formal ask to allocate a subnet or an IP. Sits in the approval queue until decided.                |
| **Audit Log**     | An immutable record of who did what, when.                                                           |

### 2.4 CIDR input format

Everywhere you see a CIDR field, the expected format is `address/prefix`:

- `10.0.0.0/8` for a /8 block
- `192.168.1.0/24` for a /24 subnet
- `10.5.1.42` (no prefix) only in the "IP Address" field on assignment

The address part should be the network address for that prefix length. Entering `10.0.0.5/8` may store the literal `10.0.0.5/8` rather than normalising to `10.0.0.0/8`, depending on validation path.

---

## 3. The pages, one by one

### 3.1 Dashboard (`/`)

**Purpose:** at-a-glance health of your entire IP space.

**What it shows:**

- Four KPI tiles across the top: Root Blocks, Total Subnets, Allocated IPs, overall Utilization %.
- **Allocation Trend (Last 12 Months)** chart: how many addresses were allocated month over month.
- **High Risk Subnets** panel: subnets nearing exhaustion, with their utilization bar.

**How to use it:** open it first thing in the morning. The trend chart tells you if allocations are accelerating; the risk panel tells you which subnets need attention.

**What to watch for:** if Utilization % shows in red, your aggregate consumption has crossed the threshold configured in Settings.

---

### 3.2 Telecom Resources (`/resources`)

**Purpose:** maintain the registry of physical and logical assets that subnets reference.

**Tabs:**

1. **Physical Sites** — locations where equipment lives. Fields: site name, region, optional site code (e.g. `LON-01`).
2. **Network Domains (VRF)** — logical routing partitions. Fields: domain name, VRF target (e.g. `vrf-oam`), description.
3. **VLAN Segments** — 802.1Q tags. Fields: VLAN ID (1 to 4094), name, optional target site, optional target domain.
4. **Network Devices** — equipment. Fields: hostname, device role (Core Router / Edge Router / Agg Switch / Access Switch / Firewall), target site, management IP.

**Flow:**

1. Click the tab for the asset type you want to manage.
2. Click **Add Site / Domain / VLAN / Device** in the top right.
3. Fill the form and submit. The new row appears in the table.

**When to use it:** at the start of a project, before you carve subnets. Subnets and VLANs reference these entries, so creating them up front lets you tag allocations with the right context.

---

### 3.3 IP Topology (`/topology`)

**Purpose:** the heart of the application. Create root blocks, carve subnets, and assign individual IP addresses.

**What you see:**

- A search bar to filter by name or CIDR.
- A tree-style table: each root block expands to show its nested subnets, indented with branch glyphs (`├─`, `└─`). Each subnet shows its CIDR, utilization (allocated / capacity, with a coloured percentage), and status.
- Per-row actions: **Assign IP**, **360 View**, and a delete button.

**Top right:**

- **Export Topology** — download the full topology as CSV.
- **+ New Block** — open the create-block modal.
- **Allocate Subnet** — open the create-subnet modal.

#### Flow A — create your first root block

1. Click **+ New Block**.
2. Enter a name (e.g. `Corporate WAN`) and a CIDR (e.g. `10.0.0.0/8`).
3. Optionally pick a Network Domain.
4. Click **Create Block**. The block appears as a collapsed row.

#### Flow B — carve a subnet under a block

1. Click **Allocate Subnet**.
2. Pick a **Parent Block** (required).
3. Optionally pick a **Parent Subnet** to nest deeper, e.g. allocate `10.5.1.0/24` inside an existing `10.5.0.0/16` subnet.
4. Fill in the CIDR plus any telecom metadata (VLAN, service type, IP range type, gateway end interface, requester name, SPOC, etc.).
5. Click **Create**. The new subnet appears under the chosen parent.

#### Flow C — assign an IP address

1. Expand the subnet you want to allocate from (click its row).
2. Click **Assign IP** on that subnet's row.
3. Enter the host address (e.g. `10.5.1.42`), optionally pick a device, mark as gateway if applicable, and fill the node details / division / department metadata.
4. Click **Assign**. The IP appears as a chip in the inline IP list under the subnet. Hover the chip to reveal a release (X) button.

#### Flow D — release an IP

1. Expand the subnet, hover the IP chip, click the X.
2. Confirm the dialog. The IP returns to the available pool.

#### Flow E — delete a subnet or block

1. Click the trash icon next to the row.
2. The confirm dialog explains the impact (nested children, allocations) and asks you to confirm. **This is destructive in the current build** (see Limitations below) — there is no undo today.

---

### 3.4 Subnet Discovery (`/discovery`)

**Purpose:** safely answer the question *"can I allocate X.X.X.X/Y without breaking anything?"* before you actually do it.

**What it does:**

- Calculates network address, broadcast address, subnet mask, and total usable host count for any CIDR you type.
- Checks the candidate range against every existing root block and subnet.
- Tells you one of three outcomes:
  - **Range Available** and contained inside a managed root block — safe to allocate.
  - **Range Available** but *not* contained in any managed block — you must create the parent block first.
  - **Collision Detected** — lists every existing block or subnet that the candidate overlaps.

**Flow:**

1. Type the CIDR you are considering (e.g. `10.5.5.0/24`).
2. Click **Evaluate Range** (or press Enter).
3. Read the result. If it is green and contained, click **Proceed to Allocate in Topology** to jump straight to the topology page.

**Use this before every new allocation.** It is faster than discovering the overlap after you submit the form, and it teaches you the layout of the space at the same time.

---

### 3.5 Approvals (`/approvals`)

**Purpose:** the queue of allocation requests waiting on a decision.

**What you see:**

- One card per request. Each card shows the request type (SUBNET or IP), the requested CIDR, who submitted it, when, and the current status (SUBMITTED / APPROVED / REJECTED / FAILED).
- Failed requests show the failure reason inline.
- **Open 360 Insight** — link to a request-scoped Planning 360 view (Section 3.7).
- For SUBMITTED requests: **Reject** and **Approve** buttons.

**Top right:**

- **Export Queue** — download the full queue as CSV.
- **New Request** — go straight to the request form.

**Flow as an approver:**

1. Open the page. Cards in `SUBMITTED` state need your decision.
2. Click **Open 360 Insight** to see context.
3. Click **Approve** or **Reject**. The card's status updates immediately.

**Important caveat:** in the current build, approving a request only changes its status. The downstream allocation step is *not* yet automated (see Limitations). You will need to create the subnet or IP yourself via the Topology page until that wiring is finished.

---

### 3.6 New Request (`/requests/new`)

**Purpose:** submit a formal ask for a new subnet or IP.

**Fields:**

- **Request Type** — Subnet Allocation or IP Address.
- **Requested CIDR** (or single IP for the IP type).
- **Parent Block** (for subnet) or **Target Subnet** (for IP).
- **Name** (optional, e.g. `Core IPRAN subnet`).
- **Service Type** (optional, e.g. `IPRAN`, `MPBN`).

**Flow:**

1. Pick the type.
2. Enter the CIDR or IP.
3. Pick the parent.
4. Submit. The page redirects to Approvals where your request now sits.

**When to use it:** any time you want a paper trail for the allocation. Engineers with direct access can allocate via the Topology page; the request flow exists for cases where the requester is not the approver, or where you want a record of who asked for what and why.

---

### 3.7 Planning 360 (`/planning-360`)

**Purpose:** a global "command centre" for searching and analysing the network, plus a deep-dive 360 view for any single subnet, pool (block), or request.

**Two pages live under this route:**

#### 3.7.1 Search / global view (`/planning-360`)

- **Global search bar** across blocks, subnets, VLANs, CIDRs.
- **Network Footprint** card: total managed root blocks and active subnets.
- **Global Intelligence** card: exhaustion risks (subnets above 80% utilisation), orphaned IPs (allocated but with no device link), fragmented blocks (more than 10 child subnets).
- **Recently Provisioned Subnets** list when no search is active.

**Flow:** type a query in the search bar. Click any block or subnet to drill into its 360 view.

#### 3.7.2 Entity 360 view (`/planning-360/:type/:id`)

Reachable by clicking **360 View** on a subnet/block row in Topology, **Open 360 Insight** in Approvals, or by clicking a search result.

**Three types:**

| Type      | What you see                                                                                                  |
|-----------|---------------------------------------------------------------------------------------------------------------|
| `subnet`  | Identity panel, capacity gauge (allocated vs free pie), actionable insights, full IP allocation table.        |
| `pool`    | Identity, total subnets built, active subnets, allocation pressure, fragmentation indicator.                  |
| `request` | Identity, SLA risk, audit trail of state changes for the request.                                             |

**Top-right export buttons:** CSV, Excel, PDF.

**When to use it:** before you commit to a big decision (carving a /20 out of a hot block, approving a request for a subnet near exhaustion), open the 360 view of the affected entity and read its insights first.

---

### 3.8 Audit Log (`/audit`)

**Purpose:** the immutable record of administrative actions and mutations.

**What you see:**

- A search bar across action, entity, user ID, and entity ID.
- A scrolling list, paginated 50 entries at a time.
- Each entry: action name, entity type (e.g. `BLOCK`, `SUBNET`, `IP`), entity ID, the acting user, timestamp, and a JSON details payload with before/after diffs where applicable.

**When to use it:** during incident response ("who deleted that block?"), during compliance review, or to understand the sequence of events on a contested allocation.

---

### 3.9 Configuration (`/config`)

**Purpose:** runtime settings that apply to the whole platform. Admin-only in spirit (no role check is enforced yet today).

**Three sections:**

1. **Platform Branding** — App title (shown in sidebar and login), optional logo URL.
2. **Risk Thresholds**
   - **High Utilization Warning (%)** — controls the red colour on the Dashboard utilisation tile.
   - **Maximum IPs per block** — cap used by some forecasting paths.
   - **Exhaustion Warning Threshold (%)** — controls when a subnet is flagged as "High Risk" on the Dashboard.
   - **Risk Pool Min Allocations** — minimum number of allocated IPs before a subnet can be considered "at risk".
3. **Organizational Map** — divisions and their departments (used in IP assignment metadata for ownership tagging).

**Flow:**

1. Change any field.
2. Click **Save All Changes** at the top right.
3. A success toast confirms and the page reloads to pick up new branding.

---

## 4. Typical end-to-end workflows

### 4.1 First-week setup

1. **Configuration** → set the app title and risk thresholds. Add your divisions and departments.
2. **Telecom Resources** → register every site, network domain, VLAN, and core device.
3. **IP Topology** → create one root block per address space you own (typically one per RFC1918 range or per regional allocation).
4. **Subnet Discovery** → verify each large carve plan before you create it.
5. **IP Topology** → carve top-level regional subnets out of each block.

### 4.2 Allocating a new subnet to an engineering team

1. Engineer opens **New Request**, asks for `10.5.5.0/24` under the `Corporate WAN` block, tags it `IPRAN`, submits.
2. Approver opens **Approvals**, clicks **Open 360 Insight** on the request, confirms there is space.
3. Approver clicks **Approve**.
4. Approver (until the auto-allocation step is wired, see Limitations) opens **IP Topology**, clicks **Allocate Subnet**, fills the request details, clicks **Create**.
5. Engineer sees the subnet in Topology and starts assigning IPs.

### 4.3 Assigning IPs for a new router pair

1. **Telecom Resources → Network Devices** → create both router entries (`core-rtr-01`, `core-rtr-02`).
2. **IP Topology** → expand the relevant subnet, click **Assign IP** for the management address of each router, link to the matching device, mark one as gateway if applicable.
3. **Audit Log** → confirm both assignments are recorded.

### 4.4 Capacity review (monthly)

1. **Dashboard** → glance at utilisation and the trend chart.
2. **Planning 360** → review the global intelligence card; click into any subnet listed as an exhaustion risk.
3. **Planning 360 entity view** → export the IP table to CSV or PDF for the meeting deck.

---

## 5. What the platform does NOT do (limitations of the current build)

Being honest about what is wired up versus what is scaffolded only:

### Workflow gaps

- **Approving a request does not automatically allocate the subnet or IP.** It only changes the request status. The actual creation must still be done manually via Topology. This is the most important caveat in the product today.
- **There is no notification system.** Submitting or approving a request does not email, message, or webhook anyone.

### Auth and identity gaps

- **No self-service signup.** Only the seeded admin can log in. Adding users requires direct database access.
- **No role-based access control in the UI.** Any logged-in user can do anything, including delete blocks and change configuration. The schema has `ADMIN` and `USER` roles but they are not enforced on endpoints.
- **No SSO, no SAML, no LDAP.**

### Multi-tenancy gaps

- **The platform is single-tenant in practice.** Even though blocks and subnets have an `owner_id` column, no service filters by it, so every user sees every block, subnet, and allocation. There is no per-team scoping.

### Metrics that are approximate

- **The "Allocation Trend (Last 12 Months)" chart on the Dashboard is a historical bar chart, not a forecast.** There is no time-series model behind it.
- **"Actionable Insights" recommendations in the 360 view are simple rule-based strings** (e.g. "Utilisation is above 80%, consider expanding"), not learned recommendations.
- **The "AI Recommendation" wording in some places should be read as "rule-based suggestion".**

### Operational gaps

- **No DHCP integration.** Allocations are tracked, not pushed to a DHCP server or DNS.
- **No DNS integration.** The platform does not create A or PTR records.
- **No network discovery.** It does not scan the network to find unmanaged IPs.
- **No import wizard.** Bulk-importing existing allocations from CSV or spreadsheets is not in the UI; you have to use the API or load via SQL.
- **Hard delete behaviour for some entities.** Deleting a root block may cascade-delete subnets; recovery requires backup restore. Confirm dialogs warn you, but there is no soft-delete-with-undo flow today.
- **Redis is provisioned but unused.** No caching layer yet, so heavy dashboard reads hit Postgres each time.

### UI rough edges

- **No "create" form in the Audit Log page** (it is read-only by design, but you cannot filter by date range or export filtered results yet).
- **No drag-and-drop on the topology tree.** Reorganising the hierarchy requires deleting and recreating.
- **No live updates.** If another user creates a subnet, your page does not reflect it until you refresh.
- **No keyboard shortcuts** beyond the standard browser ones.

---

## 6. Features that could be added next

Grouped by impact. None of these exist today; this is a wishlist sketched from what the data model already supports.

### High-impact, would change daily use

1. **Real approval → allocation wiring.** Clicking Approve should call `POST /api/ipam/subnets` (or `/ips`) atomically and update the request status only on success.
2. **Role-based access control.** Enforce `ADMIN` for destructive ops and configuration; restrict regular users to read + request submission.
3. **DHCP / DNS push integrations.** When an IP is allocated, optionally push to ISC-DHCP / Infoblox / route53 / your DNS of choice.
4. **Bulk import via UI.** Drag a CSV of existing subnets and have the platform validate + ingest with a preview.
5. **Multi-tenant scoping.** Filter everything by `owner_id`, with a "team selector" in the header.

### Medium-impact, would unlock new flows

6. **Email or Slack notifications** on request submit, approve, reject.
7. **A real forecast** (Holt-Winters or simple regression) for allocation rate per block, with confidence intervals on when each block exhausts.
8. **A visual topology graph** (tree or force-directed) alongside the table.
9. **Reservations / hold windows.** Tag a CIDR as "reserved for project X until date Y" without fully allocating it.
10. **IP scanning / reconciliation.** Periodically ping/SNMP-scan known subnets and surface drift (allocated-but-unreachable, in-use-but-not-allocated).

### Quality of life

11. **Date range and entity-type filters on Audit Log**, plus the ability to export filtered results.
12. **Keyboard shortcuts** for create-block / create-subnet / assign-IP.
13. **Soft delete with restore** for blocks, subnets, and IPs (the schema is partly ready for this).
14. **Live updates** via WebSocket so concurrent edits propagate without a refresh.
15. **Saved searches and dashboards** per user.
16. **Per-subnet history view** (a timeline of every allocation/release) in addition to the global audit log.
17. **API tokens for automation**, so CI / scripts can create allocations without using the admin password.
18. **Custom metadata schemas per service type** (e.g. IPRAN allocations have one set of required fields, MPBN another).
19. **2FA on login.**
20. **Dark-mode / light-mode toggle.** Today the platform is dark-only.

---

## 7. Getting help and reporting issues

- For known engineering issues with confidence ratings, see [APP-ISSUES.md](./APP-ISSUES.md).
- For the phased remediation plan that is actively closing those issues, see [PLAN.md](./PLAN.md).
- For setup and operational commands, see [README.md](./README.md) and [docs/operational-runbook.md](./docs/operational-runbook.md).
- For agent-development conventions (commit style, required skills, file layout), see [CLAUDE.md](./CLAUDE.md).

---

*Last updated: 2026-05-22.*
