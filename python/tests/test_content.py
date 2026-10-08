import json

import httpx
import pytest

from gridbank_api import (
    NotAuthenticated,
    NotLicensed,
    AccessRevoked,
    PartnerApiNotIncluded,
    PartnerClient,
    ContentError,
    VideoNotFound,
)

BASE = "https://api2.gridbank.io/partner/v1"
SIGNED = "https://s3.example/video.mp4?sig=abc"


def video(key: str) -> dict:
    return {
        "video_key": key,
        "title": f"Clip {key}",
        "duration_seconds": 12.5,
        "purchased_at": 1756200000,
        "preview_url": "https://cdn.example/p.mp4",
        "thumbnail_url": "https://cdn.example/t.jpg",
        "creator": {"id": "crea_1", "username": "jdoe", "name": "J Doe"},
    }


def search_hit(key: str) -> dict:
    return {
        "video_key": key,
        "title": f"Clip {key}",
        "duration_seconds": 8.0,
        "width_pixels": 1080,
        "height_pixels": 1920,
        "preview_url": "https://cdn.example/p.mp4",
        "thumbnail_url": "https://cdn.example/t.jpg",
        "creator": {"id": "crea_1", "username": "jdoe", "name": "J Doe"},
    }


def search_page(keys: list, has_more: bool) -> httpx.Response:
    return httpx.Response(
        200,
        json={"videos": [search_hit(k) for k in keys], "has_more": has_more, "search_id": "s1"},
    )


def sent_body(route, call: int = 0) -> dict:
    return json.loads(route.calls[call].request.content)


def error_body(message: str) -> dict:
    return {"detail": {"error": {"code": "x", "message": message, "details": {}}}}


@pytest.fixture
def client():
    with PartnerClient(api_key="apik_test.secret") as c:
        yield c


class TestConstruction:
    def test_an_empty_key_is_rejected_up_front(self):
        with pytest.raises(ValueError):
            PartnerClient(api_key="")


class TestContentIteration:
    def test_it_follows_the_cursor_across_pages(self, respx_mock, client):
        respx_mock.get(f"{BASE}/content", params={"cursor": "c1"}).mock(
            return_value=httpx.Response(200, json={"videos": [video("c")], "next_cursor": None})
        )
        respx_mock.get(f"{BASE}/content").mock(
            return_value=httpx.Response(
                200, json={"videos": [video("a"), video("b")], "next_cursor": "c1"}
            )
        )

        assert [v.id for v in client.content()] == ["a", "b", "c"]

    def test_it_stops_when_there_is_no_cursor(self, respx_mock, client):
        route = respx_mock.get(f"{BASE}/content").mock(
            return_value=httpx.Response(200, json={"videos": [video("a")], "next_cursor": None})
        )

        assert len(list(client.content())) == 1
        assert route.call_count == 1

    def test_an_empty_library_yields_nothing(self, respx_mock, client):
        respx_mock.get(f"{BASE}/content").mock(
            return_value=httpx.Response(200, json={"videos": [], "next_cursor": None})
        )

        assert list(client.content()) == []

    def test_it_does_not_fetch_pages_the_caller_never_asks_for(self, respx_mock, client):
        """Laziness is the point of an iterator - stopping early must cost nothing."""
        route = respx_mock.get(f"{BASE}/content").mock(
            return_value=httpx.Response(
                200, json={"videos": [video("a"), video("b")], "next_cursor": "c1"}
            )
        )

        first = next(client.content())

        assert first.id == "a"
        assert route.call_count == 1

    def test_it_parses_the_video(self, respx_mock, client):
        respx_mock.get(f"{BASE}/content").mock(
            return_value=httpx.Response(200, json={"videos": [video("a")], "next_cursor": None})
        )

        first = next(client.content())

        assert first.id == "a"
        assert first.title == "Clip a"
        assert first.duration == 12.5
        assert first.url == "https://cdn.example/p.mp4"
        assert first.thumbnail == "https://cdn.example/t.jpg"
        assert first.purchased_at == 1756200000
        assert first.creator.id == "crea_1"
        assert first.creator.username == "jdoe"


class TestSearch:
    def test_it_sends_the_query_and_filters(self, respx_mock, client):
        route = respx_mock.post(f"{BASE}/search").mock(return_value=search_page([], False))

        list(
            client.search(
                "surf",
                location="Lisbon, PRT",
                sort="recent",
                duration_gte=5,
                duration_lte=20,
                per_page=10,
            )
        )

        assert sent_body(route) == {
            "query": "surf",
            "location": "Lisbon, PRT",
            "sort": "recent",
            "duration_gte": 5,
            "duration_lte": 20,
            "items": 10,
            "page": 0,
        }

    def test_unset_filters_are_left_to_the_server(self, respx_mock, client):
        """The API rejects null durations, so an omitted filter must not be sent at all."""
        route = respx_mock.post(f"{BASE}/search").mock(return_value=search_page([], False))

        list(client.search("surf"))

        assert sent_body(route) == {"query": "surf", "items": 50, "page": 0}

    def test_it_pages_while_there_is_more(self, respx_mock, client):
        route = respx_mock.post(f"{BASE}/search").mock(
            side_effect=[search_page(["a", "b"], True), search_page(["c"], False)]
        )

        assert [v.id for v in client.search("surf")] == ["a", "b", "c"]
        assert [sent_body(route, i)["page"] for i in range(2)] == [0, 1]

    def test_a_short_page_is_not_the_end(self, respx_mock, client):
        """Only has_more ends the search; a page can come back under-filled."""
        respx_mock.post(f"{BASE}/search").mock(
            side_effect=[search_page(["a"], True), search_page(["b"], False)]
        )

        assert [v.id for v in client.search("surf", per_page=10)] == ["a", "b"]

    def test_it_does_not_fetch_pages_the_caller_never_asks_for(self, respx_mock, client):
        route = respx_mock.post(f"{BASE}/search").mock(return_value=search_page(["a", "b"], True))

        assert next(client.search("surf")).id == "a"
        assert route.call_count == 1

    def test_it_parses_the_hit(self, respx_mock, client):
        respx_mock.post(f"{BASE}/search").mock(return_value=search_page(["a"], False))

        first = next(client.search("surf"))

        assert first.id == "a"
        assert first.title == "Clip a"
        assert first.duration == 8.0
        assert first.width == 1080
        assert first.height == 1920
        assert first.url == "https://cdn.example/p.mp4"
        assert first.thumbnail == "https://cdn.example/t.jpg"
        assert first.purchased_at is None
        assert first.creator.username == "jdoe"

    def test_a_validation_error_is_a_content_error(self, respx_mock, client):
        respx_mock.post(f"{BASE}/search").mock(
            return_value=httpx.Response(
                422, json={"detail": [{"loc": ["body", "query"], "msg": "too short"}]}
            )
        )

        with pytest.raises(ContentError) as e:
            list(client.search(" "))
        assert e.value.status_code == 422

    def test_a_rate_limited_search_is_retried(self, respx_mock, client, monkeypatch):
        slept = []
        monkeypatch.setattr("gridbank_api._content.time.sleep", slept.append)
        route = respx_mock.post(f"{BASE}/search").mock(
            side_effect=[
                httpx.Response(429, headers={"Retry-After": "7"}),
                search_page(["a"], False),
            ]
        )

        assert [v.id for v in client.search("surf")] == ["a"]
        assert slept == [7.0]
        assert route.call_count == 2
        assert sent_body(route, 1) == sent_body(route, 0)


class TestErrorMapping:
    @pytest.mark.parametrize(
        "status,expected",
        [(401, NotAuthenticated), (403, NotLicensed), (404, VideoNotFound), (500, ContentError)],
    )
    def test_status_becomes_a_typed_error(self, respx_mock, client, status, expected):
        respx_mock.get(f"{BASE}/videos/v1/download").mock(
            return_value=httpx.Response(status, json=error_body("nope"))
        )

        with pytest.raises(expected) as e:
            client.download_url("v1")
        assert e.value.status_code == status

    def test_not_licensed_is_distinguishable_from_missing(self, respx_mock, client):
        """A caller retries one of these by buying a licence, not by fixing a typo."""
        respx_mock.get(f"{BASE}/videos/v1/download").mock(
            return_value=httpx.Response(403, json=error_body("Video not purchased."))
        )

        with pytest.raises(NotLicensed) as e:
            client.download_url("v1")
        assert "not purchased" in e.value.message.lower()
        assert not isinstance(e.value, VideoNotFound)

    def test_an_edge_403_is_not_a_licensing_error(self, respx_mock, client):
        """WAF rejections carry no error envelope and say nothing about licensing."""
        respx_mock.get(f"{BASE}/videos/v1/download").mock(
            return_value=httpx.Response(403, json={"message": "Forbidden"})
        )

        with pytest.raises(ContentError) as e:
            client.download_url("v1")
        assert not isinstance(e.value, NotLicensed)
        assert e.value.status_code == 403

    def test_a_revoked_account_is_not_a_licensing_error(self, respx_mock, client):
        """Both are 403 with an envelope. Only the code separates "buy this
        video" from "GridBank has blocked you", and the second is not fixable
        by the caller."""
        respx_mock.get(f"{BASE}/videos/v1/download").mock(
            return_value=httpx.Response(
                403,
                json={
                    "detail": {
                        "error": {
                            "code": "partner_access_revoked",
                            "message": "Partner API access has been revoked for this account",
                            "details": {},
                        }
                    }
                },
            )
        )

        with pytest.raises(AccessRevoked) as e:
            client.download_url("v1")
        assert not isinstance(e.value, NotLicensed)
        assert e.value.status_code == 403
        assert "revoked" in e.value.message.lower()

    def test_a_revoked_account_is_reported_from_listing_too(self, respx_mock, client):
        respx_mock.get(f"{BASE}/content").mock(
            return_value=httpx.Response(
                403,
                json={
                    "detail": {
                        "error": {
                            "code": "partner_access_revoked",
                            "message": "Partner API access has been revoked for this account",
                            "details": {},
                        }
                    }
                },
            )
        )

        with pytest.raises(AccessRevoked):
            list(client.content())

    def test_revocation_is_still_a_content_error(self, respx_mock, client):
        """Callers catching ContentError broadly must not start leaking this."""
        assert issubclass(AccessRevoked, ContentError)

    def test_a_non_json_body_still_raises_cleanly(self, respx_mock, client):
        respx_mock.get(f"{BASE}/content").mock(
            return_value=httpx.Response(502, text="<html>bad</html>")
        )

        with pytest.raises(ContentError) as e:
            list(client.content())
        assert e.value.status_code == 502


class TestDownload:
    def test_it_streams_to_a_path(self, respx_mock, client, tmp_path):
        respx_mock.get(f"{BASE}/videos/v1/download").mock(
            return_value=httpx.Response(200, json={"url": SIGNED, "expires_at": 1})
        )
        respx_mock.get(SIGNED).mock(return_value=httpx.Response(200, content=b"video-bytes"))

        target = tmp_path / "clip.mp4"
        client.download("v1", target)

        assert target.read_bytes() == b"video-bytes"

    def test_an_interrupted_download_leaves_no_file(self, respx_mock, client, tmp_path):
        """A truncated file that looks complete is worse than no file."""
        respx_mock.get(f"{BASE}/videos/v1/download").mock(
            return_value=httpx.Response(200, json={"url": SIGNED, "expires_at": 1})
        )
        respx_mock.get(SIGNED).mock(side_effect=httpx.ReadError("connection dropped"))

        target = tmp_path / "clip.mp4"
        with pytest.raises(httpx.ReadError):
            client.download("v1", target)

        assert not target.exists()

    def test_an_expired_url_is_requested_again(self, respx_mock, client, tmp_path):
        """The URL lives five minutes; going stale mid-queue is normal, not an error."""
        url_route = respx_mock.get(f"{BASE}/videos/v1/download").mock(
            return_value=httpx.Response(200, json={"url": SIGNED, "expires_at": 1})
        )
        respx_mock.get(SIGNED).mock(
            side_effect=[
                httpx.Response(403, text="<Error>AccessDenied</Error>"),
                httpx.Response(200, content=b"fresh-bytes"),
            ]
        )

        target = tmp_path / "clip.mp4"
        client.download("v1", target)

        assert target.read_bytes() == b"fresh-bytes"
        assert url_route.call_count == 2

    def test_it_gives_up_after_one_retry(self, respx_mock, client, tmp_path):
        respx_mock.get(f"{BASE}/videos/v1/download").mock(
            return_value=httpx.Response(200, json={"url": SIGNED, "expires_at": 1})
        )
        respx_mock.get(SIGNED).mock(return_value=httpx.Response(403, text="denied"))

        with pytest.raises(ContentError):
            client.download("v1", tmp_path / "clip.mp4")

    def test_a_retry_keeps_what_the_caller_already_wrote(self, respx_mock, client, tmp_path):
        """The first URL fails before a single byte is streamed, so there is
        nothing to undo — and the handle may hold data that is not ours."""
        respx_mock.get(f"{BASE}/videos/v1/download").mock(
            return_value=httpx.Response(200, json={"url": SIGNED, "expires_at": 1})
        )
        respx_mock.get(SIGNED).mock(
            side_effect=[
                httpx.Response(403, text="<Error>AccessDenied</Error>"),
                httpx.Response(200, content=b"fresh-bytes"),
            ]
        )

        target = tmp_path / "clip.mp4"
        target.write_bytes(b"existing-")
        with open(target, "r+b") as handle:
            handle.seek(0, 2)
            client.download("v1", handle)

        assert target.read_bytes() == b"existing-fresh-bytes"

    def test_it_writes_to_an_open_file(self, respx_mock, client, tmp_path):
        respx_mock.get(f"{BASE}/videos/v1/download").mock(
            return_value=httpx.Response(200, json={"url": SIGNED, "expires_at": 1})
        )
        respx_mock.get(SIGNED).mock(return_value=httpx.Response(200, content=b"abc"))

        target = tmp_path / "clip.mp4"
        with open(target, "wb") as handle:
            client.download("v1", handle)

        assert target.read_bytes() == b"abc"

    def test_an_unlicensed_video_raises_before_any_fetch(self, respx_mock, client, tmp_path):
        respx_mock.get(f"{BASE}/videos/v1/download").mock(
            return_value=httpx.Response(403, json=error_body("Video not purchased."))
        )

        with pytest.raises(NotLicensed):
            client.download("v1", tmp_path / "clip.mp4")


class TestPlanWithoutPartnerApi:
    def test_search_reports_the_plan_not_a_licence(self, respx_mock, client):
        """Search has no video to license, so this 403 must not read as NotLicensed."""
        respx_mock.post(f"{BASE}/search").mock(
            return_value=httpx.Response(
                403,
                json={
                    "detail": {
                        "error": {
                            "code": "partner_api_not_included",
                            "message": "Your plan does not include Partner API access",
                            "details": None,
                        }
                    }
                },
            )
        )

        with pytest.raises(PartnerApiNotIncluded) as e:
            list(client.search("surfing"))
        assert not isinstance(e.value, NotLicensed)
        assert isinstance(e.value, ContentError)
        assert e.value.status_code == 403
