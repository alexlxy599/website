#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import unicodedata
from html import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from PIL import Image, ImageOps


PROJECT_ROOT = Path(__file__).resolve().parents[1]
INBOX_DIR = Path("/Users/alex/Desktop/portfolio-inbox/photos-gallery")
OUTPUT_DIR = PROJECT_ROOT / "assets/photos/inbox"
CONTENT_FILE = PROJECT_ROOT / "content.js"

HOST = "127.0.0.1"
PORT = 8765

KNOWN_FILES = {
    "000044.JPG": ("subway-platform.jpg", "Platform", "地铁站台上的人影", "wide"),
    "000048.JPG": ("subway-crowd.jpg", "Crowd Study", "地铁站里的俯视人群", "tall"),
    "57a9d980-98be-11ec-b41f-7f19f8332621_gallery.JPG": (
        "gallery-57a9d980.jpg",
        "Gallery Image",
        "横幅摄影作品",
        "wide",
    ),
    "9346ae20-2ce1-11ed-ae01-9dcef9dd63e4_gallery.JPG": (
        "gallery-9346ae20.jpg",
        "Gallery Image",
        "竖幅摄影作品",
        "tall",
    ),
    "DSC00775.JPG": ("gulls-at-sunset.jpg", "Gulls", "日落时飞过的人群与海鸟", "wide"),
    "DSC00797.JPG": ("sunset-frame.jpg", "Through Glass", "窗框里的海上日落", "wide"),
    "DSC00805-2.JPG": ("roof-gull.jpg", "Roof Gull", "屋檐上的海鸥", "tall"),
    "DSC00813.JPG": ("vertical-sun.jpg", "Vertical Sun", "竖幅海上日落", "tall"),
    "DSC00816.JPG": ("amber-sun.jpg", "Amber Sun", "金色海面上的落日", "tall"),
    "DSC00823.JPG": ("coastal-evening.jpg", "Coastal Evening", "傍晚的海岸线", "wide"),
    "DSC00867.JPG": ("violet-coast.jpg", "Violet Coast", "紫色暮光里的海岸", "tall"),
    "DSC00892.JPG": ("red-light-figure.jpg", "Red Light", "红色光线照亮的人物", "wide"),
    "DSC01093.JPG": ("winter-mountain.jpg", "Winter Mountain", "雪地中的山脉", "wide"),
    "DSC01673.JPG": ("winter-road.jpg", "Winter Road", "冬日道路上的夕阳", "wide"),
    "DSC01822 2.JPG": ("street-elder.jpg", "Street Elder", "阳光街道上的老人", "wide"),
    "DSC02373.JPG": ("wheel-field.jpg", "Wheel Field", "草地远处的摩天轮", "tall"),
    "DSC02386.JPG": ("village-facade-new.jpg", "Village Facade", "阳光下的白色乡村建筑", "tall"),
    "DSC02622 2.JPG": ("market-stroller.jpg", "Market Shade", "市场棚下的人和婴儿车", "wide"),
    "DSC03470.JPG": ("window-sign.jpg", "Window Sign", "窗边标识和室内光线", "tall"),
    "DSC03706 2.JPG": ("tree-building.jpg", "Tree Building", "树枝与建筑立面", "wide"),
    "DSC03940-2.JPG": ("canal-window.jpg", "Canal Window", "窗框中的水边景色", "tall"),
    "DSC05068 2.JPG": ("church-tower.jpg", "Church Tower", "蓝天下的教堂塔楼", "tall"),
    "DSC05163-2 3.JPG": ("evening-couple.jpg", "Evening Pair", "黄昏里靠在一起的人", "tall"),
    "DSC06505.JPG": ("fireworks-bridge.jpg", "Fireworks", "桥边夜空中的烟花", "wide"),
    "DSC06899-Enhanced-NR.JPG": ("sailboat-swimmer.jpg", "Sailboat", "海面上的帆船与游泳者", "wide"),
    "DSC07099.JPG": ("birds-between-buildings.jpg", "Birds Between Buildings", "楼宇间飞过的鸟", "wide"),
    "DSC08973.JPG": ("lake-silhouette.jpg", "Lake Silhouette", "湖边的人影和山", "tall"),
    "DSC09032-2.JPG": ("snow-negative.jpg", "Snow Negative", "黑白反相质感的雪山", "wide"),
    "DSC09462.JPG": ("quiet-building.jpg", "Quiet Building", "安静光线里的建筑", "wide"),
    "DSCF1491.JPG": ("wind-window.jpg", "Wind Window", "车窗外的风车与暮色", "wide"),
    "DSCF3066.JPG": ("vending-machines.jpg", "Vending Machines", "街边自动售货机", "wide"),
    "IMG_4216.JPG": ("img-4216.jpg", "Gallery Image", "横幅摄影作品", "wide"),
    "IMG_4821.JPG": ("img-4821.jpg", "Gallery Image", "横幅摄影作品", "wide"),
    "IMG_5321.JPG": ("img-5321.jpg", "Gallery Image", "竖幅摄影作品", "tall"),
}


def read_content() -> dict:
    text = CONTENT_FILE.read_text()
    json_text = re.sub(r"^\s*window\.PORTFOLIO_CONTENT\s*=\s*", "", text).rstrip().rstrip(";")
    return json.loads(json_text)


def write_content(content: dict) -> None:
    CONTENT_FILE.write_text(
        "window.PORTFOLIO_CONTENT = "
        + json.dumps(content, ensure_ascii=False, indent=2)
        + ";\n",
    )


def slugify(name: str) -> str:
    stem = Path(name).stem.lower()
    stem = unicodedata.normalize("NFKD", stem).encode("ascii", "ignore").decode()
    stem = re.sub(r"[^a-z0-9]+", "-", stem).strip("-") or "photo"
    return f"{stem}.jpg"


def infer_layout(width: int, height: int) -> str:
    if height > width * 1.25:
        return "tall"
    if width > height * 1.25:
        return "wide"
    return ""


def image_files() -> list[Path]:
    if not INBOX_DIR.exists():
        return []
    return sorted(
        path
        for path in INBOX_DIR.iterdir()
        if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )


def output_info(path: Path) -> tuple[str, str, str, str]:
    if path.name in KNOWN_FILES:
        return KNOWN_FILES[path.name]
    with Image.open(path) as image:
        width, height = ImageOps.exif_transpose(image).size
    return slugify(path.name), path.stem, path.stem, infer_layout(width, height)


def current_photos_by_output() -> dict[str, dict]:
    content = read_content()
    photos = content.get("photos", [])
    return {Path(photo.get("src", "")).name: photo for photo in photos}


def photo_rows() -> list[dict]:
    existing = current_photos_by_output()
    rows = []
    for index, source in enumerate(image_files()):
        output_name, title, alt, layout = output_info(source)
        saved = existing.get(output_name, {})
        rows.append(
            {
                "index": index,
                "source": str(source),
                "sourceName": source.name,
                "outputName": output_name,
                "src": f"assets/photos/inbox/{output_name}",
                "title": saved.get("title") or title,
                "city": saved.get("location", ""),
                "layout": saved.get("layout", layout),
                "alt": saved.get("alt") or alt,
            }
        )
    return rows


def compress_photo(source: Path, output_name: str) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    image = Image.open(source)
    image = ImageOps.exif_transpose(image).convert("RGB")
    width, height = image.size
    max_size = 1900 if width >= height else 1600
    scale = min(1, max_size / max(width, height))
    if scale < 1:
        image = image.resize((round(width * scale), round(height * scale)), Image.Resampling.LANCZOS)
    image.save(OUTPUT_DIR / output_name, quality=84, optimize=True, progressive=True)


def save_rows(rows: list[dict]) -> int:
    content = read_content()
    photos = []
    for row in rows:
        source = Path(row["source"])
        output_name = row["outputName"]
        city = row.get("city", "").strip()
        layout = row.get("layout", "").strip()
        alt = row.get("alt", "").strip() or city or row["sourceName"]
        compress_photo(source, output_name)
        photos.append(
            {
                "title": city,
                "location": city,
                "layout": layout,
                "src": f"assets/photos/inbox/{output_name}",
                "alt": alt,
            }
        )
    content["photos"] = photos
    write_content(content)
    return len(photos)


def page_html(message: str = "") -> bytes:
    rows = photo_rows()
    cards = "\n".join(
        f"""
        <article class="card">
          <img src="/image?i={row['index']}" alt="{escape(row['sourceName'])}" loading="lazy" />
          <div>
            <header>
              <strong>{escape(row['city'] or '未标城市')}</strong>
              <span>{escape(row['sourceName'])}</span>
            </header>
            <label>城市
              <input name="city" value="{escape(row['city'])}" placeholder="例如 Vancouver / Tokyo / Kyoto" />
            </label>
            <label>版式
              <input name="layout" value="{escape(row['layout'])}" placeholder="wide / tall / large / 留空" />
            </label>
            <label>图片描述
              <input name="alt" value="{escape(row['alt'])}" />
            </label>
            <input type="hidden" name="source" value="{escape(row['source'])}" />
            <input type="hidden" name="sourceName" value="{escape(row['sourceName'])}" />
            <input type="hidden" name="outputName" value="{escape(row['outputName'])}" />
          </div>
        </article>
        """
        for row in rows
    )
    html = f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Photo Intake</title>
  <style>
    :root {{ --paper:#f8f1e5; --ink:#211d19; --muted:#766f66; --line:rgba(33,29,25,.16); }}
    * {{ box-sizing:border-box; }}
    body {{ margin:0; background:var(--paper); color:var(--ink); font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif; }}
    header.top {{ position:sticky; top:0; z-index:5; display:flex; justify-content:space-between; gap:18px; align-items:center; padding:20px clamp(18px,4vw,56px); background:rgba(248,241,229,.9); border-bottom:1px solid var(--line); backdrop-filter:blur(16px); }}
    h1 {{ margin:0; font-family:Georgia, serif; font-size:clamp(30px,4vw,52px); font-weight:500; }}
    p {{ color:var(--muted); }}
    button, a.button {{ min-height:40px; padding:9px 14px; color:#fffaf1; background:var(--ink); border:1px solid var(--ink); border-radius:999px; cursor:pointer; text-decoration:none; font:inherit; }}
    main {{ padding:28px clamp(18px,4vw,56px) 64px; }}
    .notice {{ margin:0 0 18px; padding:12px 14px; color:#245e67; background:rgba(36,94,103,.1); border:1px solid rgba(36,94,103,.18); border-radius:8px; }}
    form {{ display:grid; gap:14px; }}
    .card {{ display:grid; grid-template-columns:minmax(160px,240px) minmax(0,1fr); gap:16px; padding:14px; background:rgba(255,250,241,.72); border:1px solid var(--line); border-radius:10px; }}
    .card img {{ width:100%; aspect-ratio:4/3; object-fit:contain; background:rgba(33,29,25,.06); border:1px solid var(--line); border-radius:8px; }}
    .card div {{ display:grid; gap:10px; }}
    .card header {{ display:flex; justify-content:space-between; gap:12px; align-items:baseline; }}
    .card header span {{ color:var(--muted); font-size:12px; }}
    label {{ display:grid; gap:6px; color:var(--muted); font-size:13px; font-weight:700; }}
    input {{ width:100%; padding:11px 12px; color:var(--ink); background:rgba(255,255,255,.66); border:1px solid var(--line); border-radius:8px; font:inherit; }}
    footer.actions {{ position:sticky; bottom:0; display:flex; gap:10px; padding:14px 0 0; background:linear-gradient(transparent, var(--paper) 35%); }}
    @media (max-width:780px) {{ .card {{ grid-template-columns:1fr; }} header.top {{ align-items:flex-start; flex-direction:column; }} }}
  </style>
</head>
<body>
  <header class="top">
    <div>
      <h1>照片入库</h1>
      <p>把照片放进 <code>{escape(str(INBOX_DIR))}</code>，在这里给每张标城市。</p>
    </div>
    <a class="button" href="/">重新扫描</a>
  </header>
  <main>
    {f'<p class="notice">{escape(message)}</p>' if message else ''}
    <form method="post" action="/save">
      {cards or '<p class="notice">还没有照片。先把图片放进 photos-gallery 文件夹。</p>'}
      <footer class="actions">
        <button type="submit">保存到网站</button>
      </footer>
    </form>
  </main>
</body>
</html>"""
    return html.encode("utf-8")


class IntakeHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        url = urlparse(self.path)
        if url.path == "/image":
            self.serve_image(url.query)
            return
        self.respond(page_html())

    def do_POST(self) -> None:
        if self.path != "/save":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        data = parse_qs(self.rfile.read(length).decode("utf-8"), keep_blank_values=True)
        rows = []
        sources = data.get("source", [])
        for index, source in enumerate(sources):
            rows.append(
                {
                    "source": source,
                    "sourceName": data.get("sourceName", [""])[index],
                    "outputName": data.get("outputName", [""])[index],
                    "city": data.get("city", [""])[index],
                    "layout": data.get("layout", [""])[index],
                    "alt": data.get("alt", [""])[index],
                }
            )
        count = save_rows(rows)
        self.respond(page_html(f"已保存 {count} 张照片到网站内容。回到主页或摄影页刷新即可预览。"))

    def serve_image(self, query: str) -> None:
        params = parse_qs(query)
        try:
            index = int(params.get("i", ["0"])[0])
            source = image_files()[index]
        except (IndexError, ValueError):
            self.send_error(404)
            return
        image = Image.open(source)
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail((520, 390), Image.Resampling.LANCZOS)
        from io import BytesIO

        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=82)
        body = buffer.getvalue()
        self.send_response(200)
        self.send_header("Content-Type", "image/jpeg")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def respond(self, body: bytes) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:
        return


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), IntakeHandler)
    print(f"Photo intake running at http://{HOST}:{PORT}")
    print(f"Scanning: {INBOX_DIR}")
    server.serve_forever()


if __name__ == "__main__":
    main()
