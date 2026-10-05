#version 460 core
#include <flutter/runtime_effect.glsl>

precision highp float;

uniform vec2 uSize;
uniform float uYaw;
uniform float uPitch;
uniform float uFov;
uniform sampler2D uPano;

out vec4 fragColor;

const float PI = 3.14159265359;

void main() {
    vec2 fragCoord = FlutterFragCoord().xy;

    vec2 ndc = (fragCoord / uSize) * 2.0 - 1.0;
    ndc.y = -ndc.y;
    float aspect = uSize.x / uSize.y;

    float t = tan(uFov * 0.5);
    vec3 ray = normalize(vec3(ndc.x * t * aspect, ndc.y * t, 1.0));

    float cp = cos(uPitch), sp = sin(uPitch);
    ray = vec3(ray.x, ray.y * cp - ray.z * sp, ray.y * sp + ray.z * cp);

    float cy = cos(uYaw), sy = sin(uYaw);
    ray = vec3(ray.x * cy + ray.z * sy, ray.y, -ray.x * sy + ray.z * cy);

    float u = atan(ray.x, ray.z) / (2.0 * PI) + 0.5;
    float v = acos(clamp(ray.y, -1.0, 1.0)) / PI;

    fragColor = texture(uPano, vec2(u, v));
}
