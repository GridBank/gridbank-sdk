"""List what your account has licensed, then download one clip.

    pip install gridbank-api
    export GRIDBANK_API_KEY=apik_...        # from gridbank.io/account/api-keys
    python smoke_partner.py

The key is read from the environment on purpose. A key in a source file ends up
in version control, and anyone holding it can download your whole library.
"""
import os
import sys

from gridbank_api import PartnerClient
from gridbank_api._content import AccessRevoked, ContentError, NotAuthenticated

api_key = os.environ.get("GRIDBANK_API_KEY")
if not api_key:
    sys.exit("set GRIDBANK_API_KEY (see https://gridbank.io/account/api-keys)")

# Identify your application. Unidentified automated traffic is treated as a bot
# at the edge, so a real User-Agent is worth setting.
client = PartnerClient(api_key=api_key, user_agent="my-app/1.0")

try:
    videos = list(client.content())
except NotAuthenticated:
    sys.exit("that key is not valid - check it was copied whole, id and secret")
except AccessRevoked as e:
    sys.exit(f"{e} - contact GridBank")
except ContentError as e:
    sys.exit(f"{type(e).__name__}: {e}")

print(f"{len(videos)} licensed video(s)")
for video in videos[:10]:
    print(f"  {video.id}  {video.title or '(untitled)'}")

if not videos:
    sys.exit("nothing licensed on this account yet")

# Masters are usually QuickTime. The format is not in the listing, so you pick
# the extension; the signed URL's content-disposition carries the real filename.
first = videos[0]
target = f"{first.id}.mov"

# download() handles the five-minute expiry on the signed URL, and writes via a
# temporary file so an interrupted transfer cannot leave a truncated one behind.
client.download(first.id, target)
print(f"downloaded {target} ({os.path.getsize(target):,} bytes)")
