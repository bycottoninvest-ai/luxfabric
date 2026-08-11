"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Volume2, VolumeX } from "lucide-react";
import { formatSom } from "@/lib/utils";

export type StoreReel = {
  id: string;
  title: string;
  caption: string;
  videoUrl: string;
  buyButtonLabel: string;
  showBuyButton: boolean;
  /** true = musiqa videoga mux qilingan */
  audioEmbedded?: boolean;
  music: { title: string; artist: string; fileUrl: string } | null;
  product: { name: string; slug: string; price: number } | null;
  username: string;
};

export function ReelsFeed({ reels, focusId }: { reels: StoreReel[]; focusId?: string }) {
  if (reels.length === 0) return null;

  return (
    <div className="snap-y snap-mandatory">
      {reels.map((reel, idx) => (
        <ReelCard
          key={reel.id}
          reel={reel}
          priority={idx === 0 || reel.id === focusId}
          autoFocus={idx === 0}
        />
      ))}
    </div>
  );
}

function ReelCard({
  reel,
  priority,
  autoFocus,
}: {
  reel: StoreReel;
  priority?: boolean;
  autoFocus?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const useSeparateAudio = !!reel.music && !reel.audioEmbedded;
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (autoFocus && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "auto", block: "start" });
    }
  }, [autoFocus]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
          setPlaying(true);
          if (useSeparateAudio && audioRef.current && !muted) {
            audioRef.current.currentTime = video.currentTime;
            audioRef.current.play().catch(() => {});
          }
        } else {
          video.pause();
          audioRef.current?.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.65 }
    );
    io.observe(video);
    return () => io.disconnect();
  }, [muted, useSeparateAudio]);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio || !useSeparateAudio) return;
    const sync = () => {
      if (Math.abs(audio.currentTime - video.currentTime) > 0.35) {
        audio.currentTime = video.currentTime;
      }
    };
    video.addEventListener("timeupdate", sync);
    return () => video.removeEventListener("timeupdate", sync);
  }, [useSeparateAudio]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (useSeparateAudio) {
      video.muted = true;
    } else {
      video.muted = muted;
    }
  }, [muted, useSeparateAudio]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (useSeparateAudio && audioRef.current) {
      audioRef.current.muted = next;
      if (!next && playing) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    } else if (videoRef.current) {
      videoRef.current.muted = next;
    }
  }

  return (
    <article ref={cardRef} className="relative snap-start overflow-hidden bg-black">
      <div className="relative min-h-[78dvh] w-full aspect-[9/16]">
        <video
          ref={videoRef}
          src={reel.videoUrl}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          loop
          muted={useSeparateAudio ? true : muted}
          preload={priority ? "auto" : "metadata"}
        />
        {useSeparateAudio && reel.music && (
          <audio ref={audioRef} src={reel.music.fileUrl} loop preload="metadata" muted={muted} />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/25" />

        <div className="absolute left-3 top-3 text-[13px] font-semibold text-white drop-shadow">
          @{reel.username}
        </div>

        <button
          type="button"
          onClick={toggleMute}
          className="absolute right-3 top-3 rounded-full bg-black/35 p-2 text-white"
          aria-label="Ovoz"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        <div className="absolute bottom-4 left-3 right-3 space-y-2.5 text-white">
          {reel.caption ? (
            <p className="line-clamp-2 text-sm drop-shadow">{reel.caption}</p>
          ) : (
            <p className="text-sm font-semibold drop-shadow">{reel.title}</p>
          )}
          {reel.music && (
            <div className="truncate text-[11px] text-white/70">
              ♪ {reel.music.title} — {reel.music.artist}
            </div>
          )}
          {reel.product && (
            <div className="text-xs text-white/80">
              {reel.product.name} · {formatSom(reel.product.price)}
            </div>
          )}
          {reel.showBuyButton && reel.product && (
            <Link
              href={`/product/${reel.product.slug}?from=instagram`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-lf-red py-3 text-sm font-bold text-white"
            >
              <ShoppingBag className="h-4 w-4" /> {reel.buyButtonLabel || "Sotib olish"}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
