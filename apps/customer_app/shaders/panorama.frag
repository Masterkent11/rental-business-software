#version 460 core
#include <flutter/runtime_effect.glsl>

// Equirectangular panorama → perspective view.
//
// The projection runs on the GPU because the alternative — reprojecting pixels
// in Dart on every frame — cannot hold 60fps on a mid-range Android phone,
// which is the device story 6.4 is about. A fragment shader also means no 3D
// mesh package: Flutter draws one quad and this decides what each pixel shows.

precision highp float;

uniform vec2 uSize;      // viewport, logical pixels
uniform float uYaw;      // radians, wraps
uniform float uPitch;    // radians, clamped by the caller
uniform float uFov;      // vertical field of view, radians
uniform sampler2D uPano; // the equirectangular texture

out vec4 fragColor;

const float PI = 3.14159265359;

void main() {
    vec2 fragCoord = FlutterFragCoord().xy;

    // Normalised device coords, y up, aspect-corrected so a square room does
    // not stretch on a tall phone.
    vec2 ndc = (fragCoord / uSize) * 2.0 - 1.0;
    ndc.y = -ndc.y;
    float aspect = uSize.x / uSize.y;

    // Ray through the pixel, in camera space. tan(fov/2) sets the zoom: a
    // narrower fov is a longer lens, which is what pinch-to-zoom changes.
    float t = tan(uFov * 0.5);
    vec3 ray = normalize(vec3(ndc.x * t * aspect, ndc.y * t, 1.0));

    // Rotate by pitch (around x) then yaw (around y). Order matters: the other
    // way round rolls the horizon as you look up, which reads as the room
    // tipping over.
    float cp = cos(uPitch), sp = sin(uPitch);
    ray = vec3(ray.x, ray.y * cp - ray.z * sp, ray.y * sp + ray.z * cp);

    float cy = cos(uYaw), sy = sin(uYaw);
    ray = vec3(ray.x * cy + ray.z * sy, ray.y, -ray.x * sy + ray.z * cy);

    // Back to equirectangular coordinates.
    float u = atan(ray.x, ray.z) / (2.0 * PI) + 0.5;
    float v = acos(clamp(ray.y, -1.0, 1.0)) / PI;

    fragColor = texture(uPano, vec2(u, v));
}
