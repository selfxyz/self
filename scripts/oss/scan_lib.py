"""Collectors and writers for scan.sh. Standard library only."""
import argparse, csv, datetime, fnmatch, hashlib, json, os, re, subprocess, sys, tomllib, urllib.parse, urllib.request

UA = {"User-Agent": "oss-licence-scan"}
CACHE = os.path.join(os.environ.get("XDG_CACHE_HOME", os.path.expanduser("~/.cache")), "oss-scan", "licences.json")

SPDX_OK = set("""MIT MIT-0 ISC Apache-2.0 BSD-2-Clause BSD-3-Clause 0BSD Unlicense CC0-1.0 Zlib
BlueOak-1.0.0 Python-2.0 CC-BY-4.0 CC-BY-3.0 BSL-1.0 WTFPL Unicode-3.0 Unicode-DFS-2016 OFL-1.1
MPL-2.0 MPL-1.1 EPL-1.0 EPL-2.0 CDDL-1.0 CDDL-1.1 LGPL-2.0-only LGPL-2.0-or-later LGPL-2.1
LGPL-2.1-only LGPL-2.1-or-later LGPL-3.0 LGPL-3.0-only LGPL-3.0-or-later GPL-2.0 GPL-2.0-only
GPL-2.0-or-later GPL-3.0 GPL-3.0-only GPL-3.0-or-later AGPL-3.0 AGPL-3.0-only AGPL-3.0-or-later
SSPL-1.0 BUSL-1.1 OpenSSL Artistic-2.0 BSD-4-Clause libpng-2.0 IJG X11 curl NCSA PSF-2.0
Classpath-exception-2.0""".split())

# Common spellings in POMs and podspecs -> SPDX id. Anything else stays as written.
ALIAS = {re.sub(r"[^a-z0-9]", "", k.lower()): v for k, v in {
    "The Apache Software License, Version 2.0": "Apache-2.0", "Apache License, Version 2.0": "Apache-2.0", "Apache License 2.0": "Apache-2.0",
    "The Apache License, Version 2.0": "Apache-2.0", "Apache 2.0": "Apache-2.0", "Apache-2": "Apache-2.0", "Apache": "Apache-2.0", "Apache 2": "Apache-2.0",
    "The MIT License": "MIT", "MIT License": "MIT", "The MIT License (MIT)": "MIT", "mit": "MIT", "zlib": "Zlib", "CC0": "CC0-1.0",
    "Eclipse Public License 1.0": "EPL-1.0", "Eclipse Public License - v 1.0": "EPL-1.0", "ISC License": "ISC",
    "The BSD 3-Clause License": "BSD-3-Clause", "BSD 3-Clause": "BSD-3-Clause", "BSD 2-Clause": "BSD-2-Clause",
}.items()}


def norm(lic):
    return " / ".join(ALIAS.get(re.sub(r"[^a-z0-9]", "", p.lower()), p) for p in lic.split(" / ")) if lic else lic


STRONG = re.compile(r"\bA?GPL|SSPL", re.I)
WEAK = re.compile(r"LGPL|MPL|EPL|CDDL|EUPL|OSL-|CC-BY-SA|Lesser", re.I)
RESTRICTED = re.compile(r"BUSL|Business Source|Commons Clause|FSL-|Elastic|SEE LICEN|proprietary|Community License|Terms of Service|Development Kit License|^Copyright$", re.I)


def _one(p):
    if re.search(r"LGPL|Lesser", p, re.I) or (WEAK.search(p) and not STRONG.search(p)):
        return "weak"
    if STRONG.search(p):
        return "strong"
    if RESTRICTED.search(p):
        return "restricted"
    if all(t in SPDX_OK for t in re.split(r"\s+AND\s+|\s+WITH\s+", p)):
        return "ok"
    return "non-standard"


def classify(lic):
    """Categories: ok, strong, weak, restricted, unknown, non-standard, dual.
    "dual" needs an explicit OR. A list joined with " / " (relation not stated) takes its worst member."""
    if not lic:
        return "unknown"
    worst = lambda cs: next((c for c in ("strong", "weak", "restricted", "non-standard") if c in cs), "ok")
    listed = []
    for item in lic.split(" / "):
        alts = [_one(a.strip(" ()")) for a in re.split(r"\s+OR\s+", item)]
        listed.append("dual" if len(alts) > 1 and "ok" in alts and worst(alts) != "ok" else worst(alts))
    if all(c in ("ok", "dual") for c in listed):
        return "dual" if "dual" in listed else "ok"
    return worst(listed)


# ---------------------------------------------------------------- lookups
class Lookup:
    def __init__(self, offline):
        self.offline = offline
        self.c = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
        self.calls = 0
        self.failed = 0

    def save(self):
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        json.dump(self.c, open(CACHE, "w"))

    def _get(self, url, raw=False):
        self.calls += 1
        try:
            b = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()
            return b.decode("utf-8", "replace") if raw else json.loads(b)
        except Exception:
            return None

    def depsdev(self, system, items):
        want = [(n, v) for n, v in items if f"{system}:{n}@{v}" not in self.c]
        if self.offline:
            return
        for i in range(0, len(want), 400):
            body = {"requests": [{"versionKey": {"system": system, "name": n, "version": v}} for n, v in want[i:i + 400]]}
            tok = None
            while True:
                if tok:
                    body["pageToken"] = tok
                req = urllib.request.Request("https://api.deps.dev/v3alpha/versionbatch", data=json.dumps(body).encode(),
                                             headers={**UA, "Content-Type": "application/json"})
                self.calls += 1
                res = json.load(urllib.request.urlopen(req, timeout=60))
                for x in res.get("responses", []):
                    vk, ver = x["request"]["versionKey"], x.get("version")
                    lic = [l for l in (ver or {}).get("licenses", []) if l != "non-standard"]
                    self.c[f'{system}:{vk["name"]}@{vk["version"]}'] = {"lic": " / ".join(lic), "src": ("deps.dev" + (" (lists several licences; AND/OR not stated)" if len(lic) > 1 else "")) if lic else ""}
                tok = res.get("nextPageToken")
                if not tok:
                    break
            self.save()

    def npm(self, items):
        self.depsdev("NPM", items)
        for n, v in items:
            e = self.c.get(f"NPM:{n}@{v}")
            if e is None or e["lic"] or e.get("tried") or self.offline:
                continue
            r = self._get("https://registry.npmjs.org/" + urllib.parse.quote(n, safe="@") + "/" + v)
            if r is None:
                self.failed += 1
                continue
            lic = r.get("license")
            if isinstance(lic, dict):
                lic = lic.get("type")
            if not lic and r.get("licenses"):
                lic = " OR ".join(x.get("type", "") for x in r["licenses"] if isinstance(x, dict))
            self.c[f"NPM:{n}@{v}"] = {"lic": lic or "", "src": "npm registry" if lic else "", "tried": 1}
        self.save()
        return {(n, v): self.c.get(f"NPM:{n}@{v}", {"lic": "", "src": ""}) for n, v in items}

    def maven(self, items):
        self.depsdev("MAVEN", items)
        for n, v in items:
            e = self.c.get(f"MAVEN:{n}@{v}")
            if e is None or e["lic"] or e.get("tried") or self.offline:
                continue
            g, a = n.split(":")
            lic, src = "", ""
            for base, label in (("https://repo1.maven.org/maven2", "Maven Central POM"), ("https://dl.google.com/android/maven2", "Google Maven POM"),
                                ("https://jitpack.io", "JitPack POM")):
                pom = self._get(f"{base}/{g.replace('.', '/')}/{a}/{v}/{a}-{v}.pom", raw=True)
                if not pom:
                    continue
                m = re.search(r"<licenses>(.*?)</licenses>", pom, re.S)
                names = re.findall(r"<name>\s*(.*?)\s*</name>", m.group(1), re.S) if m else []
                lic, src = " / ".join(names), label
                break
            if not src:
                self.failed += 1  # no POM reachable: stay unknown this run, try again next run
                continue
            self.c[f"MAVEN:{n}@{v}"] = {"lic": lic, "src": src if lic else src + " (no licence in POM)", "tried": 1}
        self.save()
        return {(n, v): self.c.get(f"MAVEN:{n}@{v}", {"lic": "", "src": ""}) for n, v in items}

    def cargo(self, items):
        self.depsdev("CARGO", items)
        return {(n, v): self.c.get(f"CARGO:{n}@{v}", {"lic": "", "src": ""}) for n, v in items}

    def github(self, slugs):
        """Licence of a public GitHub repository, as GitHub detects it (used for Swift packages)."""
        out = {}
        for slug in slugs:
            k = f"GH:{slug}"
            if k not in self.c and not self.offline:
                r = self._get(f"https://api.github.com/repos/{slug}/license")
                if r is None:
                    self.failed += 1
                    out[slug] = {"lic": "", "src": ""}
                    continue
                spdx_id = (r.get("license") or {}).get("spdx_id") or ""
                self.c[k] = {"lic": "" if spdx_id in ("", "NOASSERTION") else spdx_id, "src": "GitHub licence detection for the source repository"}
            out[slug] = self.c.get(k, {"lic": "", "src": ""})
        self.save()
        return out

    def pods(self, items):
        out = {}
        for n, v in items:
            k = f"POD:{n}@{v}"
            if k not in self.c and not self.offline:
                h = hashlib.md5(n.encode()).hexdigest()
                r = self._get(f"https://cdn.cocoapods.org/Specs/{h[0]}/{h[1]}/{h[2]}/{n}/{v}/{n}.podspec.json")
                if r is None:
                    self.failed += 1
                    out[(n, v)] = {"lic": "", "src": ""}
                    continue
                lic = r.get("license")
                if isinstance(lic, dict):
                    lic = lic.get("type")
                self.c[k] = {"lic": lic or "", "src": "CocoaPods trunk podspec" if lic else ""}
            out[(n, v)] = self.c.get(k, {"lic": "", "src": ""})
        self.save()
        return out


# ---------------------------------------------------------------- collectors
def gitshow(a, path):
    r = subprocess.run(["git", "-C", a.repo, "show", f"{a.sha}:{path}"], capture_output=True)
    return r.stdout.decode("utf-8", "replace") if r.returncode == 0 else None


def split(v):
    return [x.strip() for x in (v or "").split(",") if x.strip()]


GRADLE_CONF = re.compile(r"(implementation|api|compileonly|runtimeonly|kapt|ksp|annotationprocessor)$", re.I)


def gradle_declared(a):
    """Dependencies declared in the given Gradle files (Groovy or Kotlin DSL), with a version catalog if given.
    Returns ({module: (version, scope)}, {project path: scope})."""
    libs, bundles = {}, {}
    if a.version_catalog:
        cat = tomllib.loads(gitshow(a, a.version_catalog) or "")
        vers = cat.get("versions", {})
        for alias, d in cat.get("libraries", {}).items():
            if isinstance(d, str):
                g, n, v = (d.split(":") + [""])[:3]
            else:
                g, n = (d["module"].split(":") if "module" in d else (d.get("group", ""), d.get("name", "")))
                v = d.get("version", "")
                v = vers.get(v.get("ref", ""), v.get("require", "")) if isinstance(v, dict) else v
            libs[re.sub(r"[-_]", ".", alias)] = (f"{g}:{n}", str(v))
        bundles = {re.sub(r"[-_]", ".", k): [re.sub(r"[-_]", ".", x) for x in v] for k, v in cat.get("bundles", {}).items()}
    mods, projects = {}, {}

    def add(mod, ver, conf):
        scope = "dev" if re.search(r"test|debug|kapt|ksp|annotationprocessor", conf, re.I) else "prod"
        if mod not in mods or (scope == "prod" and mods[mod][1] == "dev"):
            mods[mod] = (ver or "unresolved", scope)

    for path in split(a.gradle_files):
        txt = gitshow(a, path)
        if txt is None:
            sys.exit(f"gradle file not found at this ref: {path}")
        for line in txt.splitlines():
            m = re.match(r"\s*(\w+)\s*[( ]\s*(.*)$", line)
            if not m or not GRADLE_CONF.search(m.group(1)):
                continue
            conf, rest = m.group(1), m.group(2)
            pm = re.search(r"project\(\s*(?:path\s*[:=]\s*)?['\"]([^'\"]+)['\"]", rest)
            cm = re.search(r"['\"]([\w.\-]+):([\w.\-]+)(?::([^'\"@]+))?(?:@\w+)?['\"]", rest)
            lm = re.search(r"libs\.([\w.]+)", rest)
            if pm:
                projects[pm.group(1)] = "prod"
            elif cm:
                add(f"{cm.group(1)}:{cm.group(2)}", cm.group(3) or "", conf)
            elif lm:
                alias = lm.group(1)
                for al in (bundles.get(alias[len("bundles."):], []) if alias.startswith("bundles.") else [alias]):
                    if al in libs:
                        add(libs[al][0], libs[al][1], conf)
                    else:
                        add(f"catalog:{al}", "", conf)
    return mods, projects


def swift_rows(a, lk, first_party):
    pk = {}
    for path in split(a.swift):
        txt = gitshow(a, path)
        if txt is None:
            sys.exit(f"swift file not found at this ref: {path}")
        if path.endswith(".resolved"):
            d = json.loads(txt)
            for p in d.get("pins") or d.get("object", {}).get("pins", []):
                url, st = p.get("location") or p.get("repositoryURL", ""), p.get("state", {})
                pk[url] = (st.get("version") or (st.get("revision") or "")[:12], "resolved")
        else:
            for m in re.finditer(r"\.package\(\s*(?:name:\s*\"[^\"]*\"\s*,\s*)?url:\s*\"([^\"]+)\"\s*,\s*(.*)$", txt, re.M):
                req = re.sub(r"\)\s*,?\s*(//.*)?$", "", re.sub(r"\s+", " ", m.group(2)).strip()).replace('"', "'")
                pk.setdefault(m.group(1), (req, "declared"))
    slug = lambda u: re.sub(r"\.git$", "", re.sub(r"^(https://|git@)github\.com[/:]", "", u))
    isfp = lambda n: any(x.strip("@/").lower() in n.lower() for x in first_party)
    lic = lk.github(sorted(slug(u) for u in pk if "github.com" in u and not isfp(u)))
    rows = []
    for url, (ver, how) in sorted(pk.items()):
        n = slug(url)
        if isfp(url):
            l, src = "", "first-party, not looked up"
        else:
            e = lic.get(n, {"lic": "", "src": ""})
            l, src = e["lic"], e["src"] + ("" if how == "resolved" else " (version is the declared requirement, not a resolved pin)")
        rows.append(dict(eco="swiftpm", name=n, version=ver, licence=l, source=src, scope="prod", direct="direct" if how == "declared" else ""))
    return rows


def podspec_rows(a, lk, first_party):
    rows = []
    for path in split(a.podspec):
        txt = gitshow(a, path)
        if txt is None:
            sys.exit(f"podspec not found at this ref: {path}")
        for m in re.finditer(r"\.dependency\s+['\"]([^'\"/]+)[^'\"]*['\"](?:\s*,\s*['\"]([^'\"]+)['\"])?", txt):
            name, req = m.group(1), m.group(2) or ""
            vm = re.match(r"^(?:~>|>=|=)?\s*([\d.]+)$", req)
            e = lk.pods([(name, vm.group(1))])[(name, vm.group(1))] if vm and not any(x.strip("@/").lower() in name.lower() for x in first_party) else {"lic": "", "src": ""}
            rows.append(dict(eco="cocoapods", name=name, version=req or "any", licence=norm(e["lic"]), scope="prod", direct="direct",
                             source=(e["src"] + " (looked up at the lowest version the requirement allows)") if e["lic"] else "podspec requirement, not looked up"))
    return rows


def npmlock_rows(a, lk, first_party):
    found = {}
    for path in split(a.npm_lock):
        txt = gitshow(a, path)
        if txt is None:
            sys.exit(f"package-lock.json not found at this ref: {path}")
        for k, p in json.loads(txt).get("packages", {}).items():
            if "node_modules/" not in k or p.get("link"):
                continue
            key = (k.split("node_modules/")[-1], p.get("version", ""))
            scope = "dev" if p.get("dev") else "prod"
            lic = p.get("license") if isinstance(p.get("license"), str) else ""
            if key not in found or (scope == "prod" and found[key][0] == "dev"):
                found[key] = (scope, lic or found.get(key, ("", ""))[1])
    fp = lambda n: any(n.startswith(x) for x in first_party)
    look = lk.npm(sorted(k for k, v in found.items() if not v[1] and not fp(k[0])))
    rows = []
    for (n, v), (scope, lic) in sorted(found.items()):
        if fp(n):
            l, src = lic, "first-party (registry package), not looked up"
        elif lic:
            l, src = lic, "licence field in package-lock.json"
        else:
            l, src = look[(n, v)]["lic"], look[(n, v)]["src"]
        rows.append(dict(eco="npm", name=n, version=v, licence=l, source=src, scope=scope, direct=""))
    return rows


def yarnlock_rows(a, lk, first_party):
    """Yarn berry lockfile. Argument: "path/to/yarn.lock:workspace1,workspace2" (workspace folders whose
    `dependencies` are the runtime roots). Everything else in the lockfile is dev scope."""
    if not a.yarn_lock:
        return []
    path, _, wss = a.yarn_lock.partition(":")
    txt = gitshow(a, path)
    if txt is None:
        sys.exit(f"yarn.lock not found at this ref: {path}")
    entries, by_desc, cur, block = [], {}, None, None
    for line in txt.splitlines():
        if line and not line.startswith((" ", "#", "__metadata")) and line.endswith(":"):
            cur = {"descs": [d.strip().strip('"') for d in line[:-1].strip('"').split(",")], "deps": {}, "version": ""}
            entries.append(cur)
            for d in cur["descs"]:
                by_desc[d] = cur
            block = None
        elif cur is not None and line.startswith("  ") and not line.startswith("    "):
            k, _, v = line.strip().partition(":")
            block = k if not v.strip() else None
            if k == "version":
                cur["version"] = v.strip().strip('"')
        elif cur is not None and line.startswith("    ") and block in ("dependencies", "optionalDependencies"):
            k, _, v = line.strip().partition(":")
            cur["deps"][k.strip().strip('"')] = v.strip().strip('"')
    name_of = lambda d: d[:d.index("@", 1)]
    roots = []
    for ws in [x.strip() for x in wss.split(",") if x.strip()]:
        pj = json.loads(gitshow(a, f"{ws}/package.json") or "{}")
        wentry = next((e for e in entries if any(d.endswith(f"@workspace:{ws}") for d in e["descs"])), None)
        for dep in (pj.get("dependencies") or {}):
            if wentry and dep in wentry["deps"]:
                roots.append(f"{dep}@{wentry['deps'][dep]}")
    prod, q = set(), list(roots)
    while q:
        d = q.pop()
        e = by_desc.get(d) or by_desc.get(d.replace("@npm:", "@", 1))
        if e is None or id(e) in prod:
            continue
        prod.add(id(e))
        q += [f"{n}@{r}" for n, r in e["deps"].items()]
    found = {}
    for e in entries:
        if any("@workspace:" in d for d in e["descs"]) or not e["version"]:
            continue
        key = (name_of(e["descs"][0]), e["version"])
        if id(e) in prod or key not in found:
            found[key] = "prod" if id(e) in prod else found.get(key, "dev")
    fp = lambda n: any(n.startswith(x) for x in first_party)
    look = lk.npm(sorted(k for k in found if not fp(k[0])))
    return [dict(eco="npm", name=n, version=v, licence="" if fp(n) else look[(n, v)]["lic"], scope=sc, direct="",
                 source="first-party (registry package), not looked up" if fp(n) else look[(n, v)]["src"]) for (n, v), sc in sorted(found.items())]


def cargo_rows(a, lk, first_party):
    rows = []
    for path in split(a.cargo_lock):
        txt = gitshow(a, path)
        if txt is None:
            sys.exit(f"Cargo.lock not found at this ref: {path}")
        lock = tomllib.loads(txt)
        man = tomllib.loads(gitshow(a, os.path.join(os.path.dirname(path), "Cargo.toml")) or "")
        root = (man.get("package") or {}).get("name")
        devonly = set(man.get("dev-dependencies", {})) - set(man.get("dependencies", {})) - set(man.get("build-dependencies", {}))
        byname = {}
        for p in lock.get("package", []):
            byname.setdefault(p["name"], []).append(p)

        def resolve(dep):
            parts = dep.split(" ")
            c = byname.get(parts[0], [])
            c = [p for p in c if len(parts) > 1 and p["version"] == parts[1]] or c
            return c[0] if c else None

        rp = next((p for p in lock.get("package", []) if p["name"] == root), None)
        prod = None
        if rp:
            prod, q = set(), [resolve(d) for d in rp.get("dependencies", []) if d.split(" ")[0] not in devonly]
            while q:
                p = q.pop()
                if p and (p["name"], p["version"]) not in prod:
                    prod.add((p["name"], p["version"]))
                    q += [resolve(d) for d in p.get("dependencies", [])]
        pkgs = [p for p in lock.get("package", []) if p["name"] != root]
        ext = [(p["name"], p["version"]) for p in pkgs if p.get("source", "").startswith("registry+")]
        lic = lk.cargo(sorted(ext))
        for p in pkgs:
            k = (p["name"], p["version"])
            if k in lic:
                l, src = lic[k]["lic"].replace(" / ", " OR "), lic[k]["src"]
            else:
                l, src = "", ("first-party, not looked up" if not p.get("source") else "git/url dependency, not looked up")
            rows.append(dict(eco="cargo", name=k[0], version=k[1], licence=l, source=src, direct="",
                             scope="prod" if (prod is None or k in prod) else "dev"))
    return rows



def ws_licence(a, path):
    """Licence field and LICENSE file of a workspace package, read at the scanned commit."""
    try:
        pj = json.loads(subprocess.run(["git", "-C", a.repo, "show", f"{a.sha}:{path}/package.json"], capture_output=True, text=True, check=True).stdout)
    except Exception:
        pj = {}
    files = [l.split("\t", 1)[1].strip() for l in open(os.path.join(a.work, "tree.txt")) if re.match(rf".*\t{re.escape(path)}/(LICEN[SC]E|COPYING)[^/]*$", l, re.I)]
    return pj.get("license") or "", f"first-party workspace `{path}`: licence field {pj.get('license') or 'MISSING'}; licence file {'present' if files else 'MISSING'}"



def npm_rows(work, importer, first_party, lk, a):
    p = os.path.join(work, "pnpm-lock.json")
    if not importer or not os.path.exists(p):
        return [], {}
    L = json.load(open(p))
    imps, snaps = L["importers"], L.get("snapshots", {})
    roots = [x for x in importer.split(",") if x]
    for r in roots:
        if r not in imps:
            sys.exit(f"importer {r!r} not in pnpm-lock.yaml")

    def key(n, v):
        return v if ("@" in v and not v[0].isdigit() and not v.startswith("http")) else f"{n}@{v}"

    def base(k):
        k = re.sub(r"\(.*$", "", k)
        i = k.rfind("@")
        return k[:i], k[i + 1:]

    ws = {}

    def walk(sections):
        reach, direct, seen_imp, q = {}, set(), set(roots), []
        for root in roots:
            for s in sections:
                for n, x in (imps[root].get(s) or {}).items():
                    q.append((n, x["version"], root, True))
        while q:
            n, ver, imp, top = q.pop(0)
            if ver.startswith(("link:", "workspace:")):
                t = os.path.normpath(os.path.join(imp, ver.split(":", 1)[1]))
                ws[n] = t
                if t in imps and t not in seen_imp:
                    seen_imp.add(t)
                    for s in ("dependencies", "optionalDependencies"):
                        for n2, x in (imps[t].get(s) or {}).items():
                            q.append((n2, x["version"], t, True))
                continue
            k = key(n, ver)
            if top:
                direct.add(base(k))
            if k in reach:
                continue
            reach[k] = 1
            s = snaps.get(k, {})
            for n2, v2 in {**(s.get("dependencies") or {}), **(s.get("optionalDependencies") or {})}.items():
                q.append((n2, v2, imp, False))
        return {base(k) for k in reach}, direct

    prod, pdirect = walk(["dependencies", "optionalDependencies"])
    dev, ddirect = walk(["devDependencies"])
    dev -= prod
    fp = lambda n: any(n.startswith(x) for x in first_party) or n in ws
    isurl = lambda v: v.startswith("http") or "github" in v or v.startswith("git")
    lic = lk.npm(sorted((n, v) for n, v in prod | dev if not fp(n) and not isurl(v)))
    rows = [dict(eco="npm", name=n, version="workspace", licence=ws_licence(a, t)[0], source=ws_licence(a, t)[1], scope="prod", direct="direct") for n, t in sorted(ws.items())]
    for n, v in sorted(prod | dev):
        scope = "prod" if (n, v) in prod else "dev"
        d = "direct" if (n, v) in (pdirect | ddirect) else "transitive"
        if n in ws:
            l, src = ws_licence(a, ws[n])
        elif fp(n):
            l, src = "", "first-party (registry package), not looked up"
        elif isurl(v):
            l, src = "", "git/url dependency, not looked up"
        else:
            l, src = lic[(n, v)]["lic"], lic[(n, v)]["src"]
        rows.append(dict(eco="npm", name=n, version=v, licence=l, source=src, scope=scope, direct=d))
    return rows, ws


def pod_rows(work, npm_lic, lk, first_party):
    p = os.path.join(work, "Podfile.lock")
    if not os.path.exists(p):
        return []
    sec, pods, ext, cur, trunk_names, repo = None, {}, {}, None, set(), None
    for line in open(p):
        m = re.match(r"^([A-Z][A-Z ]+):\s*$", line)
        if m:
            sec = m.group(1)
            continue
        if sec == "PODS":
            m = re.match(r"^  - \"?([^\s(\"]+) \(([^)]+)\)", line)
            if m:
                pods.setdefault(m.group(1).split("/")[0], m.group(2))
        elif sec == "SPEC REPOS":
            m = re.match(r"^  \"?([^\":]+)\"?:\s*$", line)
            if m:
                repo = m.group(1)
            m = re.match(r"^    - \"?([^\"\n]+)\"?", line)
            if m and repo == "trunk":
                trunk_names.add(m.group(1))
        elif sec == "EXTERNAL SOURCES":
            m = re.match(r"^  \"?([^\":]+)\"?:\s*$", line)
            if m:
                cur = m.group(1).split("/")[0]
                continue
            m = re.match(r"^    :(\w+): \"?([^\"\n]+)\"?", line)
            if m and cur and cur not in ext:
                ext[cur] = (m.group(1), m.group(2))
    isfp = lambda n: any(x.strip("@/").lower() in n.lower() for x in first_party)
    trunk = lk.pods(sorted((n, v) for n, v in pods.items() if n in trunk_names and not isfp(n)))
    rows = []
    for n, v in sorted(pods.items()):
        if isfp(n):
            l, src = "", "first-party, not looked up"
        elif (n, v) in trunk:
            l, src = norm(trunk[(n, v)]["lic"]), trunk[(n, v)]["src"]
        elif n not in ext:
            l, src = "", "not in the trunk spec repo and no external source, not looked up"
        else:
            kind, where = ext[n]
            m = re.search(r"node_modules/((?:@[^/]+/)?[^/]+)", where)
            hit = [x for x in npm_lic if m and x[0] == m.group(1)]
            if kind == "path" and hit:
                l, src = npm_lic[hit[0]], f"npm package {m.group(1)} (local pod)"
            else:
                l, src = "", f"external source ({kind}: {where}), not looked up"
        rows.append(dict(eco="cocoapods", name=n, version=v, licence=l, source=src, scope="prod", direct=""))
    return rows


def gradle_rows(work, lk, npm_lic, first_party, a):
    rep, decl = os.path.join(work, "gradle-report.txt"), os.path.join(work, "build.gradle")
    mods, projects, declared, dproj, mode = {}, set(), {}, set(), "none"
    dscope = {}
    if split(a.gradle_files):
        dm, dp = gradle_declared(a)
        declared = {n: v for n, (v, sc) in dm.items()}
        dscope = {n: sc for n, (v, sc) in dm.items()}
        dproj = set(dp)
    elif os.path.exists(decl):
        rx = r"^\s*(\w*[iI]mplementation|api|compileOnly)\s*\(?\s*(project\(['\"]([^'\"]+)|['\"]([\w.\-]+):([\w.\-]+):([^'\"@]+))"
        for m in re.finditer(rx, open(decl).read(), re.M):
            if m.group(3):
                dproj.add(m.group(3))
            elif not re.search(r"test", m.group(1), re.I):
                declared[f"{m.group(4)}:{m.group(5)}"] = m.group(6)
    stale = []
    if os.path.exists(rep):
        mode = "resolved report"
        for line in open(rep):
            m = re.search(r"[+\\]--- (.+)$", line)
            if not m:
                continue
            t = re.sub(r"\s+\([*cn]\)$", "", m.group(1).strip())
            if t.startswith("project "):
                projects.add(t.split()[1])
                continue
            if " -> " in t and t.split(" -> ")[1].count(":") == 2:  # module substituted by another module
                t = t.split(" -> ")[1]
            m = re.match(r"^([\w.\-]+):([\w.\-]+)(?::(\S+))?(?:\s+->\s+(\S+))?", t)
            if m and (m.group(4) or m.group(3)):
                mods[f"{m.group(1)}:{m.group(2)}"] = re.sub(r"[{}]|strictly ", "", m.group(4) or m.group(3))
        # A dependency declared at this ref but absent from the report means the report is from another commit.
        stale = sorted(n for n in declared if n not in mods and "$" not in declared[n] and dscope.get(n, "prod") == "prod")
        for n in stale:
            mods[n] = declared[n]
        if stale:
            mode += f"; {len(stale)} declared at this ref but NOT in the report (report is from a different commit?)"
    elif declared or dproj:
        mode = "declared only (no transitive dependencies)"
        mods, projects = dict(declared), dproj
    isfp = lambda n: any(n.startswith(x) for x in first_party)
    lic = lk.maven(sorted((n, v) for n, v in mods.items() if not isfp(n) and not n.startswith("catalog:") and v != "unresolved" and "$" not in v))
    rows = []
    for n, v in sorted(mods.items()):
        e = lic.get((n, v), {"lic": "", "src": "first-party, not looked up" if isfp(n) else "version not resolved, not looked up"})
        rows.append(dict(eco="maven", name=n, version=v, licence=norm(e["lic"]), scope=dscope.get(n, "prod"), direct="direct" if n in declared else "",
                         source=e["src"] + (" [declared, not in report]" if n in stale else "")))
    by_name = {}
    for (n, v), l in npm_lic.items():
        by_name.setdefault(n, l)
    for p in sorted(projects):
        nm = p.lstrip(":")
        cand = [nm, "@" + nm.replace("_", "/", 1)]
        hit = next((c for c in cand if c in by_name), None)
        rows.append(dict(eco="gradle-project", name=p, version="", licence=by_name[hit] if hit else "",
                         source=f"npm package {hit} (autolinked module)" if hit else "local Gradle module, not looked up", scope="prod", direct=""))
    return rows, mode


def tree_facts(work, path, extra=()):
    files = []
    subs = []
    for line in open(os.path.join(work, "tree.txt")):
        meta, name = line.rstrip("\n").split("\t", 1)
        if meta.split()[1] == "commit":
            subs.append((name, meta.split()[2]))
        files.append(name)
    whole = path in ("", ".")
    roots = [path.rstrip("/") + "/"] + [e.rstrip("/") + "/" for e in extra]
    inpart = files if whole else [f for f in files if f.startswith(tuple(roots))]
    pick = lambda rx: [f for f in inpart if re.search(rx, f, re.I)]
    top = lambda d: [f for f in files if os.path.dirname(f) == d and re.match(r"(LICEN[SC]E|NOTICE|COPYING)", os.path.basename(f), re.I)]
    return dict(submodules=subs, binaries=pick(r"\.(jar|aar|so|a|dylib)$|\.(xcframework|framework)/Info\.plist$"),
                fonts=pick(r"\.(otf|ttf|woff2?)$"), part_licence=top("" if whole else path.rstrip("/")), root_licence=top(""))


# ---------------------------------------------------------------- writers
def spdx(rows, a, out):
    extracted, pkgs, rels = {}, [], []
    doc = "SPDXRef-DOCUMENT"
    for i, r in enumerate(rows):
        lic = r["licence"]
        if not lic:
            decl = "NOASSERTION"
        elif all(t in SPDX_OK for t in re.split(r"\s+(?:AND|OR|WITH)\s+", lic.strip("()"))):
            decl = lic
        else:
            ref = "LicenseRef-scan-" + re.sub(r"[^A-Za-z0-9.]+", "-", lic).strip("-")[:60]
            extracted[ref] = lic
            decl = ref
        sid = f"SPDXRef-Package-{i}"
        ptype = {"npm": "npm", "maven": "maven", "cocoapods": "cocoapods", "cargo": "cargo", "swiftpm": "swift"}.get(r["eco"])
        if r["eco"] == "cocoapods" and not re.match(r"^[\d.]+", r["version"]):
            ptype = None  # a version requirement, not a version
        if r["eco"] == "maven" and (r["name"].startswith("catalog:") or r["version"] == "unresolved" or "$" in r["version"]):
            ptype = None
        pk = dict(SPDXID=sid, name=r["name"], versionInfo=r["version"] or "NOASSERTION", downloadLocation="NOASSERTION",
                  filesAnalyzed=False, licenseConcluded="NOASSERTION", licenseDeclared=decl, copyrightText="NOASSERTION",
                  comment=f"scope={r['scope']}; licence source: {r['source'] or 'none'}")
        if ptype and not r["version"].startswith(("http", "git")):
            nm = r["name"].replace(":", "/") if ptype == "maven" else ("github.com/" + r["name"] if ptype == "swift" else urllib.parse.quote(r["name"], safe="/"))
            pk["externalRefs"] = [dict(referenceCategory="PACKAGE-MANAGER", referenceType="purl", referenceLocator=f"pkg:{ptype}/{nm}@{r['version']}")]
        pkgs.append(pk)
        rels.append(dict(spdxElementId="SPDXRef-Root", relationshipType="DEV_DEPENDENCY_OF" if r["scope"] == "dev" else "DEPENDS_ON", relatedSpdxElement=sid))
        if r["scope"] == "dev":
            rels[-1] = dict(spdxElementId=sid, relationshipType="DEV_DEPENDENCY_OF", relatedSpdxElement="SPDXRef-Root")
    root = dict(SPDXID="SPDXRef-Root", name=a.repo_name if a.part == "all" else f"{a.repo_name}/{a.part}", versionInfo=a.version, downloadLocation="NOASSERTION", filesAnalyzed=False,
                licenseConcluded="NOASSERTION", licenseDeclared="NOASSERTION", copyrightText="NOASSERTION", comment=f"git commit {a.sha}")
    d = dict(spdxVersion="SPDX-2.3", dataLicense="CC0-1.0", SPDXID=doc, name=f"{a.repo_name}-{a.part}-{a.sha[:9]}",
             documentNamespace=f"https://spdx.org/spdxdocs/{a.repo_name}-{a.part}-{a.sha}",
             creationInfo=dict(created=datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), creators=["Tool: oss-scan-draft"]),
             packages=[root] + pkgs, relationships=[dict(spdxElementId=doc, relationshipType="DESCRIBES", relatedSpdxElement="SPDXRef-Root")] + rels,
             hasExtractedLicensingInfos=[dict(licenseId=k, extractedText=v, name=v) for k, v in sorted(extracted.items())])
    json.dump(d, open(os.path.join(out, "sbom.spdx.json"), "w"), separators=(",", ":"))


def oss_md(rows, facts, gmode, ws, a, out, lk):
    today = datetime.date.today().isoformat()
    flagged = [r for r in rows if r["cat"] != "ok"]
    order = ["strong", "unknown", "weak", "restricted", "non-standard", "dual", "first-party"]
    title = dict(strong="GPL / AGPL / SSPL", unknown="No licence found", weak="Weak copyleft (LGPL, MPL, EPL, ...)",
                 restricted="Source-available or proprietary terms", **{"non-standard": "Licence name not recognised"}, dual="Dual licence with a permissive option (explicit OR)", **{"first-party": "First-party packages (own licence state)"})
    where = "the repo" if a.path in ("", ".") else f"`{a.path}/`"
    L = [f"# OSS scan: {a.repo_name}" + ("" if a.part == "all" else f" / {a.part}"), "",
         "Generated by `scripts/oss/scan.sh`, with hand-established answers merged in: the \"Ships?\" and \"Note\" columns come from `scripts/oss/curations.json`, the checklist answers from `scripts/oss/checks/`.", "",
         "## Version scanned", "", f"- Ref: `{a.ref}`", f"- Commit: `{a.sha}`", f"- Version at that commit: `{a.version}`", f"- Scan date: {today}",
         f"- Released as: {a.released}", "",
         "## Status", "", "@@STATUS@@", "",
         "## What the scanner covered", ""]
    label = dict(npm="npm packages", cocoapods="CocoaPods", maven="Maven modules", swiftpm="Swift packages", cargo="Rust crates")
    label["gradle-project"] = "local Gradle modules"
    for eco in ("npm", "cocoapods", "maven", "gradle-project", "swiftpm", "cargo"):
        rs = [r for r in rows if r["eco"] == eco]
        if rs:
            L.append(f"- {label[eco]}: {len(rs)} ({sum(r['scope'] == 'prod' for r in rs)} prod, {sum(r['scope'] == 'dev' for r in rs)} dev-only).")
    if any(r["eco"] in ("maven", "gradle-project") for r in rows):
        L.append(f"- Gradle mode: **{gmode}**.")
    L += ["- \"prod\" means reachable from runtime dependency declarations in the lockfile or build file. Peer dependencies are not followed.",
          f"- Workspace packages followed: {', '.join(f'`{k}`' for k in sorted(ws)) or 'none'}.",
          f"- Licence lookups: deps.dev, npm registry, Maven POMs, CocoaPods trunk, GitHub licence detection ({lk.calls} requests this run; {lk.failed} packages had no metadata the scanner could reach). "
          f"Not sent: names matching `{a.first_party}`, workspace packages, git/url dependencies, pods outside the trunk spec repo, local Gradle modules.",
          f"- Curations applied from `scripts/oss/curations.json`: {a.curated} rows.", ""]
    L += ["## Flagged dependencies", "", "\"Ships?\" is `yes` or `no` where someone traced it, otherwise `not traced`. Every dependency, with its licence, is in `sbom.spdx.json`.", ""]
    for c in order:
        rs = [r for r in flagged if r["cat"] == c]
        if not rs:
            continue
        L += [f"### {title[c]} ({len(rs)})", "", "| Package | Version | Licence | Ecosystem | Scope | Ships? | Note |", "|---|---|---|---|---|---|---|"]
        groups = {}
        for r in sorted(rs, key=lambda r: (r["scope"] != "prod", r["eco"], r["name"])):
            note = ("Exception recorded, see below. " if r["exception"] else "") + r["note"] or (r["source"] if (not r["licence"] or "AND/OR" in r["source"] or r["cat"] == "first-party") else "")
            groups.setdefault((r["licence"] or "none", r["eco"], r["scope"], r["ships"] or "not traced", note), []).append(r)
        for (lic, eco, scope, ships, note), g in groups.items():
            if len(g) > 3:  # many packages with the same answer: one row
                names = ", ".join(sorted({x["name"] for x in g}))
                L.append(f"| {len(g)} packages: {names} | see SBOM | {lic} | {eco} | {scope} | {ships} | {note} |")
            else:
                L += [f"| {x['name']} | {x['version']} | {lic} | {eco} | {scope} | {ships} | {note} |" for x in g]
        L.append("")
    exc = [r for r in rows if r["exception"]]
    if exc:
        L += ["## Exceptions", "", "Dependencies that fail a rule and were accepted rather than removed.", ""]
        L += [f"- **{r['name']} {r['version']}** ({r['licence'] or 'no licence'}): {r['exception']}" for r in exc] + [""]
    cap = lambda xs, n=40: [f"  - `{x}`" for x in xs[:n]] + ([f"  - ... and {len(xs) - n} more"] if len(xs) > n else [])
    L += ["## Check by hand", "", "The scanner cannot see these. Answers come from `scripts/oss/checks/`: a ticked box means the item was checked by hand for this scan, with the result on the line below it. An unticked box is still open.", "",
          "- [ ] CocoaPods and Gradle native dependencies: are they all in the list above?",
          "- [ ] Circom includes: which circuit libraries are included, and under which licences?",
          "- [ ] Forge libs: which libraries sit under the contracts `lib/` folder, and under which licences?",
          f"- [ ] Own licence. Files found in {where}: {', '.join(facts['part_licence']) or '**none**'}." + ("" if where == "the repo" else f" At repo root: {', '.join(facts['root_licence']) or '**none**'}."),
          "- [ ] Each flagged prod dependency: does it really ship (trace the import, or inspect the built artifact)?",
          f"- [ ] Git submodules ({len(facts['submodules'])}):"] + cap([f"{n} @ {s[:9]}" for n, s in facts["submodules"]])
    L += [f"- [ ] Vendored binaries in {where} and followed workspace packages ({len(facts['binaries'])}): what are they, and under which licence?"] + cap(facts["binaries"])
    L += [f"- [ ] Fonts in {where} and followed workspace packages ({len(facts['fonts'])}): is each one licensed for app embedding and for a public repo?"] + cap(facts["fonts"])
    gits = [r for r in rows if "git/url" in r["source"] or r["version"].startswith(("http", "git"))]
    L += [f"- [ ] Git or URL dependencies ({len(gits)}): licence read from the pinned commit?"] + cap([f"{r['name']} {r['version']}" for r in gits])
    ext = [r for r in rows if "not looked up" in r["source"] and r["eco"] in ("cocoapods", "gradle-project")]
    L += [f"- [ ] Pods and local Gradle modules the scanner could not look up ({len(ext)}):"] + cap([f"{r['name']} {r['version']} ({r['source']})" for r in ext])
    L += ["- [ ] Code cloned or downloaded at build time (private modules, postinstall downloads): scanned in its own repo?",
          "- [ ] Source files copied from other projects (licence headers that are not ours).",
          "- [ ] Android: is the Gradle list a resolved release classpath? If it says \"declared only\", resolve it.",
          "- [ ] LGPL: how is it linked or packaged (static, dynamic, merged dex, minified)?",
          "- [ ] Attribution: are the required licence texts and notices shipped with the artifact?", "",
          "## Counts by licence", "", "| Licence | Packages |", "|---|---|"]
    cnt = {}
    for r in rows:
        cnt[r["licence"] or "(none)"] = cnt.get(r["licence"] or "(none)", 0) + 1
    L += [f"| {k} | {v} |" for k, v in sorted(cnt.items(), key=lambda kv: -kv[1])]
    cp = a.checks
    checks = json.load(open(cp)) if cp and os.path.exists(cp) else {}
    unused = set(checks.get("answers", {}))
    for i, line in enumerate(L):
        for key, ans in checks.get("answers", {}).items():
            if line.startswith("- [ ] " + key):
                unused.discard(key)
                L[i] = ("- [x] " if ans.get("done") else "- [ ] ") + line[6:] + (f"\n  - Result: {ans['result']}" if ans.get("result") else "")
    if unused:
        sys.exit(f"checks.json has answers that match no checklist line: {sorted(unused)}")
    st = checks.get("status")
    if st:
        status = [st["value"], ""] + [f"- {x}" for x in st.get("reasons", [])]
    else:
        status = [checks.get("status_text", "Status: TODO (ok / nok), with every reason.")]
    k = L.index("@@STATUS@@")
    L[k:k + 1] = status
    if checks.get("scope_notes"):
        i = L.index("## Check by hand")
        L[i:i] = ["## Scope notes", ""] + [f"- {n}" for n in checks["scope_notes"]] + [""]
    open(os.path.join(out, "OSS.md"), "w").write("\n".join(L) + "\n")


def main():
    ap = argparse.ArgumentParser()
    for k in ("work", "out", "ref", "sha", "part", "path", "importer", "first-party", "offline", "repo-name", "repo", "curations", "released", "checks", "csv",
              "gradle-files", "version-catalog", "swift", "podspec", "npm-lock", "yarn-lock", "cargo-lock", "version-text"):
        ap.add_argument("--" + k, default="")
    a = ap.parse_args()
    vs = []
    for root in [x for x in (a.importer or a.path).split(",") if x and x != "."]:
        try:
            pj = json.loads(subprocess.run(["git", "-C", a.repo, "show", f"{a.sha}:{root}/package.json"], capture_output=True, text=True, check=True).stdout)
            vs.append(f"{pj.get('name', root)} {pj.get('version', '?')}")
        except Exception:
            pass
    a.version = a.version_text or "; ".join(vs) or "unknown"
    a.released = a.released or "not recorded"
    lk = Lookup(a.offline == "1")
    fps = [x for x in a.first_party.split(",") if x]
    nrows, ws = npm_rows(a.work, a.importer, fps, lk, a)
    npm_lic = {(r["name"], r["version"]): r["licence"] for r in nrows}
    prows = pod_rows(a.work, npm_lic, lk, fps)
    grows, gmode = gradle_rows(a.work, lk, npm_lic, fps, a)
    rows = nrows + npmlock_rows(a, lk, fps) + yarnlock_rows(a, lk, fps) + prows + podspec_rows(a, lk, fps) + grows + swift_rows(a, lk, fps) + cargo_rows(a, lk, fps)
    curs = json.load(open(a.curations)) if a.curations and os.path.exists(a.curations) else []
    used = 0
    for r in rows:
        r["ships"], r["note"], r["exception"] = "", "", ""
        for c in curs:
            if c.get("ecosystem") not in (None, r["eco"]) or not fnmatch.fnmatchcase(r["name"], c["name"]):
                continue
            if c.get("version") and not fnmatch.fnmatchcase(r["version"], c["version"]):
                continue
            if c.get("part") and c["part"] != a.part:
                continue
            if "if_licence" in c and not re.search(c["if_licence"], r["licence"]):
                continue
            used += 1
            if c.get("licence"):
                r["licence"], r["source"] = c["licence"], ("first-party; " if r["source"].startswith("first-party") else "") + "curation: " + c.get("evidence", "")
            r["ships"], r["note"], r["exception"] = c.get("ships", r["ships"]), c.get("note", r["note"]), c.get("exception", "")
            break
        r["cat"] = "first-party" if r["source"].startswith("first-party") else classify(r["licence"])
    a.curated = used
    if a.csv:
        with open(a.csv, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["ecosystem", "name", "version", "licence", "licence_source", "scope", "direct", "category", "ships", "note"])
            for r in rows:
                w.writerow([r["eco"], r["name"], r["version"], r["licence"], r["source"], r["scope"], r["direct"], r["cat"], r["ships"], r["note"]])
    spdx(rows, a, a.out)
    oss_md(rows, tree_facts(a.work, a.path, sorted(set(ws.values()))), gmode, ws, a, a.out, lk)
    by = {}
    for r in rows:
        by[r["cat"]] = by.get(r["cat"], 0) + 1
    print(f"{a.repo_name}/{a.part} @ {a.sha[:9]} v{a.version}: {len(rows)} dependencies, gradle mode: {gmode}")
    print("  " + ", ".join(f"{k}: {v}" for k, v in sorted(by.items())))
    print(f"  wrote {a.out}/sbom.spdx.json, OSS.md")


if __name__ == "__main__":
    main()
