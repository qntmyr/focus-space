// Audio-only YouTube playback through the IFrame Player API. The player is kept
// 1px large and off screen (never display:none, which would pause it on some
// browsers); the user only sees a status line.

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: unknown) => YTPlayer; PlayerState: Record<string, number> };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo(): void;
  stopVideo(): void;
  unMute(): void;
  setVolume(v: number): void;
  getVideoData?(): { title?: string };
  destroy(): void;
}

export interface Station {
  name: string;
  url: string;
}

export const STATIONS: Station[] = [
  { name: "Chillhop Radio", url: "https://www.youtube.com/watch?v=5yx6BWlEVcY" },
  { name: "Lofi Girl", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" },
  { name: "Lofi Girl · synthwave", url: "https://www.youtube.com/watch?v=4xDzrJKXOOY" },
];

const ERRORS: Record<number, string> = {
  2: "invalid link",
  5: "cannot play in this browser",
  100: "video not found or private",
  101: "this video cannot be embedded",
  150: "this video cannot be embedded",
  153: "blocked by YouTube on this site",
};

export function youtubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|live\/|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

let api: Promise<void> | undefined;
function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  api ??= new Promise<void>((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => resolve();
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => {
      api = undefined;
      reject(new Error("YouTube is unreachable"));
    };
    document.head.append(s);
  });
  return api;
}

export class LofiPlayer {
  private player: YTPlayer | undefined;
  playing = false;

  constructor(
    private host: HTMLElement,
    private onStatus: (text: string, playing: boolean) => void,
  ) {}

  async play(url: string): Promise<void> {
    const id = youtubeId(url);
    if (!id) {
      this.onStatus("Paste a YouTube link first.", false);
      return;
    }
    this.stop();
    this.onStatus("Connecting…", false);
    try {
      await loadApi();
    } catch (e) {
      this.onStatus((e as Error).message, false);
      return;
    }
    const mount = document.createElement("div");
    this.host.replaceChildren(mount);
    this.player = new window.YT!.Player(mount, {
      host: "https://www.youtube-nocookie.com",
      width: 1,
      height: 1,
      videoId: id,
      playerVars: { autoplay: 1, controls: 0, playsinline: 1, rel: 0 },
      events: {
        onReady: () => {
          this.player?.unMute();
          this.player?.setVolume(70);
          this.player?.playVideo();
        },
        onStateChange: (e: { data: number }) => {
          const title = this.player?.getVideoData?.()?.title;
          if (e.data === 1) {
            this.playing = true;
            this.onStatus(`Playing${title ? ` · ${title}` : ""}`, true);
          } else if (e.data === 3) this.onStatus("Buffering…", true);
          else if (e.data === 2) this.onStatus("Paused by YouTube, press Play again.", false);
        },
        onError: (e: { data: number }) => {
          this.stop();
          this.onStatus(`Can't play this stream (${ERRORS[e.data] ?? `error ${e.data}`}). Try another link.`, false);
        },
      },
    });
  }

  stop(): void {
    this.player?.destroy();
    this.player = undefined;
    this.host.replaceChildren();
    this.playing = false;
    this.onStatus("", false);
  }
}
