#!/usr/bin/env python3
"""Update paper stats (citations + GitHub stars) locally."""

import json
import re
import time
from pathlib import Path
import urllib.request

# pip install scholarly
from scholarly import scholarly

AUTHOR_ID = "3DK3I-8AAAAJ"
STATS_FILE = Path(__file__).parent.parent / "_data" / "paper_stats.json"
BIB_FILE = Path(__file__).parent.parent / "_bibliography" / "papers.bib"


def fetch_citations():
    """Fetch citation counts from Google Scholar."""
    print("Fetching citations from Google Scholar...")
    author = scholarly.search_author_id(AUTHOR_ID)
    author = scholarly.fill(author, sections=["publications"])

    citations = {}
    for pub in author.get("publications", []):
        filled_pub = scholarly.fill(pub)
        title = filled_pub.get("bib", {}).get("title", "").lower().strip()
        num_citations = filled_pub.get("num_citations", 0)
        if title:
            citations[title] = num_citations
            print(f"  {title[:60]}...: {num_citations}")
        time.sleep(0.5)  # Be nice to Scholar

    print(f"\nTotal: {len(citations)} papers")
    return citations


def fetch_github_stars():
    """Fetch GitHub stars for repos in papers.bib."""
    print("\nFetching GitHub stars...")
    bib_content = BIB_FILE.read_text()

    repos = set(re.findall(r"code\s*=\s*\{https://github\.com/([^/]+)/([^/}]+)", bib_content))

    stars = {}
    for owner, repo in repos:
        repo_path = f"{owner}/{repo}"
        try:
            req = urllib.request.Request(
                f"https://api.github.com/repos/{repo_path}",
                headers={"User-Agent": "paper-stats", "Accept": "application/vnd.github.v3+json"},
            )
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read())
                stars[repo_path] = data["stargazers_count"]
                print(f"  {repo_path}: {data['stargazers_count']} stars")
            time.sleep(0.1)
        except Exception as e:
            print(f"  {repo_path}: failed ({e})")

    return stars


def main():
    # Load existing stats
    stats = {"github": {}, "citations": {}, "updated": ""}
    if STATS_FILE.exists():
        stats = json.loads(STATS_FILE.read_text())

    # Update
    stats["citations"] = fetch_citations()
    stats["github"] = fetch_github_stars()
    stats["updated"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Save
    STATS_FILE.parent.mkdir(exist_ok=True)
    STATS_FILE.write_text(json.dumps(stats, indent=2))
    print(f"\nSaved to {STATS_FILE}")


if __name__ == "__main__":
    main()
