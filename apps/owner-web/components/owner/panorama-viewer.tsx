"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { clamp, directionFromScreen, normaliseYaw } from "@/domain/tours/tour";
import { cn } from "@/lib/utils";

export interface ViewerCamera {
  yaw: number;
  pitch: number;
  fov: number;
}

export type ViewerImageState = "loading" | "ready" | "failed";

const VERTEX = `
attribute vec2 aPosition;
varying vec2 vNdc;
void main() {
  vNdc = aPosition;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT = `
precision highp float;
varying vec2 vNdc;
uniform sampler2D uPano;
uniform float uYaw;
uniform float uPitch;
uniform float uTanHalf;
uniform float uAspect;
const float PI = 3.14159265359;
void main() {
  vec3 forward = vec3(cos(uPitch) * sin(uYaw), sin(uPitch), cos(uPitch) * cos(uYaw));
  vec3 right = vec3(cos(uYaw), 0.0, -sin(uYaw));
  vec3 up = vec3(-sin(uPitch) * sin(uYaw), cos(uPitch), -sin(uPitch) * cos(uYaw));
  vec3 ray = normalize(forward + vNdc.x * uTanHalf * uAspect * right + vNdc.y * uTanHalf * up);
  float u = atan(ray.x, ray.z) / (2.0 * PI) + 0.5;
  float v = acos(clamp(ray.y, -1.0, 1.0)) / PI;
  gl_FragColor = texture2D(uPano, vec2(u, v));
}
`;

interface GlState {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  texture: WebGLTexture;
  uniforms: Record<"yaw" | "pitch" | "tanHalf" | "aspect", WebGLUniformLocation | null>;
  hasImage: boolean;
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL shader unavailable");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "Shader failed to compile");
  return shader;
}

function setup(canvas: HTMLCanvasElement): GlState | null {
  const gl = canvas.getContext("webgl", { antialias: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  const program = gl.createProgram();
  const texture = gl.createTexture();
  const buffer = gl.createBuffer();
  if (!program || !texture || !buffer) return null;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return {
    gl,
    program,
    texture,
    hasImage: false,
    uniforms: {
      yaw: gl.getUniformLocation(program, "uYaw"),
      pitch: gl.getUniformLocation(program, "uPitch"),
      tanHalf: gl.getUniformLocation(program, "uTanHalf"),
      aspect: gl.getUniformLocation(program, "uAspect"),
    },
  };
}

function fitToTexture(image: HTMLImageElement, max: number): TexImageSource {
  if (image.naturalWidth <= max && image.naturalHeight <= max) return image;
  const scale = max / Math.max(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(image.naturalWidth * scale);
  canvas.height = Math.floor(image.naturalHeight * scale);
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function PanoramaViewer({
  imageUrl,
  camera,
  onCamera,
  onPick,
  onViewport,
  onImageState,
  picking = false,
  className,
  children,
}: {
  imageUrl: string | null;
  camera: ViewerCamera;
  onCamera: (camera: ViewerCamera) => void;
  onPick?: (direction: { yaw: number; pitch: number }) => void;
  onViewport: (size: { width: number; height: number }) => void;
  onImageState: (state: ViewerImageState) => void;
  picking?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const glState = useRef<GlState | null>(null);
  const drag = useRef<{ x: number; y: number; camera: ViewerCamera; moved: boolean; id: number } | null>(null);
  const latest = useRef({ camera, onCamera });

  useLayoutEffect(() => {
    latest.current = { camera, onCamera };
  });

  useEffect(() => {
    if (!canvas.current) return;
    try {
      glState.current = setup(canvas.current);
    } catch {
      glState.current = null;
    }
    if (!glState.current) onImageState("failed");
  }, [onImageState]);

  useEffect(() => {
    const state = glState.current;
    if (!state || !imageUrl) return;
    let cancelled = false;
    onImageState("loading");
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (cancelled) return;
      const { gl } = state;
      const max = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 4096;
      gl.bindTexture(gl.TEXTURE_2D, state.texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, fitToTexture(image, Math.min(max, 8192)));
      state.hasImage = true;
      onImageState("ready");
      latest.current.onCamera({ ...latest.current.camera });
    };
    image.onerror = () => {
      if (!cancelled) onImageState("failed");
    };
    image.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl, onImageState]);

  useEffect(() => {
    const element = wrapper.current;
    const target = canvas.current;
    if (!element || !target) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      target.width = Math.max(1, Math.floor(width * ratio));
      target.height = Math.max(1, Math.floor(height * ratio));
      onViewport({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [onViewport]);

  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const handler = (event: WheelEvent) => {
      event.preventDefault();
      const current = latest.current.camera;
      latest.current.onCamera({ ...current, fov: clamp(current.fov + event.deltaY * 0.05, 30, 110) });
    };
    element.addEventListener("wheel", handler, { passive: false });
    return () => element.removeEventListener("wheel", handler);
  }, []);

  useEffect(() => {
    const state = glState.current;
    const target = canvas.current;
    if (!state || !target || !state.hasImage) return;
    const { gl, uniforms } = state;
    const toRad = Math.PI / 180;
    gl.viewport(0, 0, target.width, target.height);
    gl.uniform1f(uniforms.yaw, camera.yaw * toRad);
    gl.uniform1f(uniforms.pitch, camera.pitch * toRad);
    gl.uniform1f(uniforms.tanHalf, Math.tan((camera.fov * toRad) / 2));
    gl.uniform1f(uniforms.aspect, target.width / Math.max(1, target.height));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  });

  return (
    <div
      ref={wrapper}
      className={cn("relative touch-none select-none overflow-hidden bg-black", picking ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing", className)}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("[data-hotspot]")) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, y: event.clientY, camera: { ...camera }, moved: false, id: event.pointerId };
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        const element = wrapper.current;
        if (!start || !element || start.id !== event.pointerId) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) start.moved = true;
        if (!start.moved) return;
        const perPixel = start.camera.fov / Math.max(1, element.clientHeight);
        onCamera({
          yaw: normaliseYaw(start.camera.yaw - dx * perPixel),
          pitch: clamp(start.camera.pitch + dy * perPixel, -85, 85),
          fov: start.camera.fov,
        });
      }}
      onPointerUp={(event) => {
        const start = drag.current;
        drag.current = null;
        const element = wrapper.current;
        if (!start || start.moved || !element || !onPick) return;
        const rect = element.getBoundingClientRect();
        onPick(
          directionFromScreen({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            width: rect.width,
            height: rect.height,
            yaw: camera.yaw,
            pitch: camera.pitch,
            fov: camera.fov,
          }),
        );
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <canvas ref={canvas} className="absolute inset-0 size-full" aria-hidden />
      {children}
    </div>
  );
}
