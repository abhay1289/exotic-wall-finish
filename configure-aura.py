#!/usr/bin/env python3
"""Create an Aura-importable HTML file using a verified asset hosting URL."""
from pathlib import Path
from urllib.parse import urljoin, urlparse
import argparse, html, re

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-url', required=True, help='The published GitHub Pages URL, with the repository path.')
parser.add_argument('--output', type=Path, default=Path(__file__).parent.parent / 'Mobel-Aura.html')
args = parser.parse_args()
base = args.base_url.rstrip('/') + '/'
parsed = urlparse(base)
if parsed.scheme not in ('http', 'https') or not parsed.netloc or parsed.username or parsed.password or parsed.query or parsed.fragment:
    parser.error('Provide a plain HTTP(S) site URL without credentials, query, or fragment.')
source = (Path(__file__).parent / 'index.html').read_text()
def absolute(match):
    attr, value = match.groups()
    if value.startswith(('#','data:','mailto:','tel:')):
        return match.group(0)
    return attr + '="' + html.escape(urljoin(base, html.unescape(value)), quote=True) + '"'
source = re.sub(r'\b(src|href|data-src)="([^"]+)"', absolute, source)
args.output.write_text(source)
print('Created ' + str(args.output))
