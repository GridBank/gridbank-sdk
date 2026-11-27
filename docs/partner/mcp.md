# Use GridBank with AI assistants

Search the GridBank catalog, browse the videos your account has licensed, and license new
ones by asking an AI assistant. GridBank runs a hosted MCP server: there is nothing to
install, and you sign in with your gridbank.io account instead of an API key.

This guide uses Claude. Any other assistant that supports remote MCP servers works too,
see [Other MCP clients](#other-mcp-clients).

!!! note "Who can use it"
    The connector is part of the Partner API, so it needs a plan that includes the Partner
    API. Other accounts can sign in, but every request is refused with
    `partner_api_not_included`.

## Add the connector

1. In Claude, open **Settings → Connectors** and choose **Add custom connector**.
2. Name it `GridBank` and enter the URL:

    ```
    https://api2.gridbank.io/mcp
    ```

3. Choose **Connect**. A gridbank.io window opens. Sign in with your GridBank account.
4. Review the access Claude is asking for. To let it license videos, tick **Also allow
   licensing videos**, then choose **Allow**. You return to Claude, and GridBank shows as
   connected.

On a Team or Enterprise Claude plan, an owner may have to add the connector for the
organisation first. Each member then connects it with their own GridBank account.

## Other MCP clients

GridBank's server follows the open Model Context Protocol, so it works with any client
that supports remote MCP servers with OAuth sign-in. Examples are Claude Code, Cursor,
VS Code with GitHub Copilot, and ChatGPT in developer mode.

Add it as a remote (HTTP) MCP server with this URL, then sign in with gridbank.io when
the client asks:

```
https://api2.gridbank.io/mcp
```

How you add a server differs between clients, so follow your client's documentation.
Everything else on this page works the same way, with one difference:

- **Asking before licensing.** Claude asks for your permission before it licenses a
  video. Other clients may not. That doesn't change what you pay: no licence is taken
  until you approve it on gridbank.io, whatever client you use.

## What Claude can do

| Access | Claude can |
|---|---|
| Read only | Search the catalog, search creators, list the videos your account has licensed |
| Licensing | All of the above, and license new videos. Each licence uses one download from your plan |

You choose the access on the gridbank.io screen that opens when you connect. Read-only
access (**Search and read**) is always granted. Licensing is granted only if you tick
**Also allow licensing videos** before you choose **Allow**. The box starts unticked, and
appears only when the assistant asks for licensing.

To change the access later, revoke the connection (see [Revoke access](#revoke-access)),
then connect again and make a different choice.

You see what your account sees through the Partner API: your own licences and those of
your team owner. Search covers the whole catalog, but a search result is a watermarked
preview, not a licence. See [What you can see](index.md#what-you-can-see).

## How licensing is confirmed

Nothing is licensed until you approve it. In Claude, that takes two steps:

1. **Claude asks you first.** Licensing is marked as an action that spends something, so
   Claude asks for your permission before it calls the licensing tool. Check the video
   it names before you allow it.
2. **You approve on gridbank.io.** This step applies in every client. Claude replies with an approval link. Open it, check
   the video, and approve it on gridbank.io. The download is only taken from your plan
   after you approve.

If you close the link without approving, nothing is licensed and nothing is charged. A
video your account already holds is never charged again.

## Limits

There is no separate daily licensing limit. Licensing is capped by your plan's download
allowance, the same as on gridbank.io. When it is used up, Claude reports
`no_downloads_remaining`.

Requests count towards the Partner API [rate limit](index.md#rate-limits) of 300 per
minute per account.

## Revoke access

To disconnect an assistant, sign in to gridbank.io and open the **API keys** page in your
account. Under **Connected apps**, find the assistant, choose **Disconnect** and confirm.
It loses access straight away, in every chat. You can connect it again later by signing
in from the assistant.

Removing the connector in the assistant's own settings only removes it there. Revoke it on
gridbank.io too if you want the access ended on GridBank's side.

## Example prompts

- *Find 10 aerial shots of the Lisbon coastline, under 15 seconds.*
- *Show me drone creators in Portugal and a few of their clips.*
- *What have we licensed this month?*
- *License the second video from that search.*
- *Give me a download link for the coastline clip we licensed yesterday.*

## Troubleshooting

| What Claude reports | What it means | What to do |
|---|---|---|
| Sign-in fails or the connection expired | The assistant's session with GridBank ended | Reconnect GridBank (in Claude: **Settings → Connectors**) |
| `partner_api_not_included` | Your plan does not include the Partner API | Change your plan on gridbank.io |
| `partner_access_revoked` | GridBank withdrew your Partner API access | Contact us. Reconnecting will not help |
| `video_not_licensed` | The video is a search preview, not a licence | Ask Claude to license it first |
| Licensing refused for read-only access | The connection only has read-only access | Revoke the connection, connect again and tick **Also allow licensing videos** |
| Licence still pending | The approval link was not approved | Open the link and approve on gridbank.io |
| `no_downloads_remaining` | This period's allowance is used up | Wait for the next period or change your plan |
| `subscription_paused`, `subscription_expired`, `no_subscription` | The subscription cannot license right now | Check your billing on gridbank.io |
| `plan_excludes_content` | The video is above your plan's content tier | Pick another video or upgrade |
| `video_not_available` | The video is not approved for licensing | Pick another video |
| Rate limited | Over 300 requests per minute | Wait a moment and try again |

For Partner API HTTP errors, see [Errors](index.md#errors).
