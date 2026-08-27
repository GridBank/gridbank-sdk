import httpx
import pytest

from gridbank_api.partner import (
    NotAuthenticated,
    NotLicensed,
    PartnerClient,
    PartnerError,
    VideoNotFound,
)

BASE = "https://api2.gridbank.io/partner/v1"
SIGNED = "https://s3.example/video.mp4?sig=abc"


def video(key: str) -> dict:
    return {
        "video_key": key,
        "title": f"Clip {key}",
        "duration_seconds": 12.5,
        "content_tier": 0,
        "purchased_at": 1756200000,
        "preview_url": "https://cdn.example/p.mp4",
        "thumbnail_url": "https://cdn.example/t.jpg",
        "creator": {"id": "crea_1", "username": "jdoe", "name": "J Doe"},
    }


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

        assert [v.video_key for v in client.content()] == ["a", "b", "c"]

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

        assert first.video_key == "a"
        assert route.call_count == 1

    def test_it_parses_the_video(self, respx_mock, client):
        respx_mock.get(f"{BASE}/content").mock(
            return_value=httpx.Response(200, json={"videos": [video("a")], "next_cursor": None})
        )

        first = next(client.content())

        assert first.title == "Clip a"
        assert first.duration_seconds == 12.5
        assert first.creator.username == "jdoe"


class TestErrorMapping:
    @pytest.mark.parametrize(
        "status,expected",
        [(401, NotAuthenticated), (403, NotLicensed), (404, VideoNotFound), (500, PartnerError)],
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

    def test_a_non_json_body_still_raises_cleanly(self, respx_mock, client):
        respx_mock.get(f"{BASE}/content").mock(
            return_value=httpx.Response(502, text="<html>bad</html>")
        )

        with pytest.raises(PartnerError) as e:
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

        with pytest.raises(PartnerError):
            client.download("v1", tmp_path / "clip.mp4")

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
